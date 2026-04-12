from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
import tensorflow as tf
import os
import sys
import json
import numpy as np

# Support both `uvicorn backend.main:app` (repo root) and `python main.py` (from backend/)
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)
from utils import preprocess_voice, preprocess_spiral

# Global variables to store models
MODELS = {}
MODELS_LOADED = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global MODELS_LOADED
    base_path = os.path.join(os.path.dirname(__file__), "models")
    try:
        MODELS["voice"] = joblib.load(os.path.join(base_path, "voice_model.pkl"))
        MODELS["voice_scaler"] = joblib.load(os.path.join(base_path, "voice_scaler.pkl"))
        MODELS["severity"] = joblib.load(os.path.join(base_path, "severity_model.pkl"))
        MODELS["severity_scaler"] = joblib.load(os.path.join(base_path, "severity_scaler.pkl"))
        MODELS["spiral"] = tf.keras.models.load_model(os.path.join(base_path, "spiral_model.h5"))
        MODELS_LOADED = True
        print("✅ All models and scalers loaded successfully")
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        print("⚠️  API will start but /analyze/full will return an error until models are available.")
    yield  # App runs here
    MODELS.clear()
    print("🛑 Models unloaded, shutting down.")

app = FastAPI(title="Parkinson's Disease Diagnostic API", lifespan=lifespan)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
async def root():
    return {"status": "online", "message": "Parkinson's Diagnostic Engine Running"}


@app.get("/health")
async def health():
    return {
        "status": "ok" if MODELS_LOADED else "degraded",
        "models_loaded": MODELS_LOADED,
    }

@app.post("/analyze/full")
async def analyze_full(
    spiralData: str = Form(...),
    voiceBlob: UploadFile = File(...)
):
    if not MODELS_LOADED:
        raise HTTPException(status_code=503, detail="Models are not loaded. Check server logs.")
    try:
        # 1. Parse Spiral Data
        print("Parsing spiral data...")
        spiral_json = json.loads(spiralData)
        traces = spiral_json.get("strokes", [])
        
        # Preprocess and Predict Spiral
        print("Preprocessing spiral...")
        spiral_img = preprocess_spiral(traces)
        print("Predicting spiral...")
        spiral_prob = float(MODELS["spiral"].predict(spiral_img, verbose=0)[0][0])
        spiral_result = "Parkinson's Detected" if spiral_prob > 0.5 else "Healthy"

        # 2. Process Voice Data
        print("Reading voice blob...")
        audio_content = await voiceBlob.read()
        print(f"Voice blob size: {len(audio_content)} bytes")
        
        print("Preprocessing voice...")
        voice_features = preprocess_voice(audio_content)
        print(f"Voice features extracted: {voice_features.shape}")
        
        # Scale voice features
        print("Scaling voice features...")
        voice_scaled = MODELS["voice_scaler"].transform(voice_features)
        
        # Voice Classification (RandomForest → class probabilities)
        print("Predicting voice...")
        voice_clf = MODELS["voice"]
        voice_proba = voice_clf.predict_proba(voice_scaled)[0]
        voice_prediction = int(voice_clf.predict(voice_scaled)[0])
        voice_confidence = float(np.max(voice_proba))
        classes = list(voice_clf.classes_)
        try:
            pd_idx = classes.index(1)
        except ValueError:
            pd_idx = len(classes) - 1
        parkinson_voice_prob = float(voice_proba[pd_idx])
        voice_result = "Parkinson's Detected" if voice_prediction == 1 else "Healthy"
        
        # 3. Predict Severity (UPDRS)
        print("Predicting severity...")
        # The severity model uses 16 acoustic features (indices 3-17 and 21 from the 22-vector)
        severity_features = np.concatenate([voice_features[:, 3:18], voice_features[:, 21:22]], axis=1)
        severity_scaled = MODELS["severity_scaler"].transform(severity_features)
        severity_score = float(MODELS["severity"].predict(severity_scaled)[0])
        print("Analysis complete!")

        return {
            "status": "success",
            "results": {
                "voice": {
                    "prediction": voice_result,
                    "confidence": round(voice_confidence, 4),
                    "status": voice_prediction,
                    "parkinson_probability": round(parkinson_voice_prob, 4),
                },
                "spiral": {
                    "prediction": spiral_result,
                    "probability": spiral_prob,
                    "status": 1 if spiral_prob > 0.5 else 0
                },
                "severity": {
                    "score": round(severity_score, 2),
                    "margin_of_error": 2.39
                }
            }
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(error_details)
        raise HTTPException(status_code=500, detail={"error": str(e), "traceback": error_details})

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
