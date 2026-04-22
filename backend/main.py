from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
import torch
import torch.nn as nn
from torchvision import models as pt_models
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
        # Load Scikit-Learn Models (Voice & Severity)
        MODELS["voice"] = joblib.load(os.path.join(base_path, "voice_model.pkl"))
        MODELS["voice_scaler"] = joblib.load(os.path.join(base_path, "voice_scaler.pkl"))
        MODELS["severity"] = joblib.load(os.path.join(base_path, "severity_model.pkl"))
        MODELS["severity_scaler"] = joblib.load(os.path.join(base_path, "severity_scaler.pkl"))
        
        device = torch.device("cpu")
        
        # --- LOAD PYTORCH RESNET MODEL FOR SPIRALS ---
        print("Loading PyTorch ResNet18 model for Spirals...")
        spiral_model = pt_models.resnet18(weights=None)
        num_ftrs = spiral_model.fc.in_features
        spiral_model.fc = nn.Sequential(
            nn.Linear(num_ftrs, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
        spiral_model_path = os.path.join(base_path, "spiral_resnet18.pth")
        spiral_model.load_state_dict(torch.load(spiral_model_path, map_location=device))
        spiral_model.eval()
        MODELS["spiral"] = spiral_model
        
        # --- LOAD PYTORCH RESNET MODEL FOR WAVES ---
        print("Loading PyTorch ResNet18 model for Waves...")
        wave_model = pt_models.resnet18(weights=None)
        wave_model.fc = nn.Sequential(
            nn.Linear(num_ftrs, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
        wave_model_path = os.path.join(base_path, "wave_resnet18.pth")
        wave_model.load_state_dict(torch.load(wave_model_path, map_location=device))
        wave_model.eval()
        MODELS["wave"] = wave_model
        # ---------------------------------------------
        
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
    waveData: str = Form(...),     # <--- NEW: Accepts wave data from frontend
    voiceBlob: UploadFile = File(...)
):
    if not MODELS_LOADED:
        raise HTTPException(status_code=503, detail="Models are not loaded. Check server logs.")
    try:
        # ==========================================
        # 1A. Parse and Predict Spiral Data
        # ==========================================
        print("Parsing spiral data...")
        spiral_json = json.loads(spiralData)
        spiral_traces = spiral_json.get("strokes", [])
        
        print("Preprocessing spiral...")
        spiral_img_array = preprocess_spiral(spiral_traces)
        
        print("Predicting spiral with PyTorch...")
        spiral_tensor = torch.tensor(spiral_img_array, dtype=torch.float32)
        with torch.no_grad():
            spiral_output = MODELS["spiral"](spiral_tensor)
            spiral_prob = float(spiral_output.item())
            
        spiral_result = "Parkinson's Detected" if spiral_prob > 0.5 else "Healthy"

        # ==========================================
        # 1B. Parse and Predict Wave Data
        # ==========================================
        print("Parsing wave data...")
        wave_json = json.loads(waveData)
        wave_traces = wave_json.get("strokes", [])
        
        print("Preprocessing wave...")
        wave_img_array = preprocess_spiral(wave_traces) # Safely reusing the exact same image formatting
        
        print("Predicting wave with PyTorch...")
        wave_tensor = torch.tensor(wave_img_array, dtype=torch.float32)
        with torch.no_grad():
            wave_output = MODELS["wave"](wave_tensor)
            wave_prob = float(wave_output.item())
            
        wave_result = "Parkinson's Detected" if wave_prob > 0.5 else "Healthy"

        # ==========================================
        # 1C. Calculate Visual Ensemble Score
        # ==========================================
        ensemble_prob = (spiral_prob + wave_prob) / 2.0
        ensemble_result = "Parkinson's Detected" if ensemble_prob > 0.5 else "Healthy"

        # ==========================================
        # 2. Process and Predict Voice Data
        # ==========================================
        print("Reading voice blob...")
        audio_content = await voiceBlob.read()
        print(f"Voice blob size: {len(audio_content)} bytes")
        
        print("Preprocessing voice...")
        voice_features = preprocess_voice(audio_content)
        
        print("Scaling voice features...")
        voice_scaled = MODELS["voice_scaler"].transform(voice_features)
        
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
        
        # ==========================================
        # 3. Predict Severity (UPDRS)
        # ==========================================
        print("Predicting severity...")
        severity_features = np.concatenate([voice_features[:, 3:18], voice_features[:, 21:22]], axis=1)
        severity_scaled = MODELS["severity_scaler"].transform(severity_features)
        severity_score = float(MODELS["severity"].predict(severity_scaled)[0])
        
        print("\n=== FINAL ANALYSIS SUMMARY ===")
        print(f"  SPIRAL:   {spiral_result} (Prob: {spiral_prob*100:.1f}%)")
        print(f"  WAVE:     {wave_result}   (Prob: {wave_prob*100:.1f}%)")
        print(f"  ENSEMBLE: {ensemble_result} (Prob: {ensemble_prob*100:.1f}%)")
        print(f"  VOICE:    {voice_result}  (Prob: {parkinson_voice_prob*100:.1f}%)")
        print(f"  UPDRS:    {severity_score:.2f}")
        print("==============================\n")
        
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
                "wave": {
                    "prediction": wave_result,
                    "probability": wave_prob,
                    "status": 1 if wave_prob > 0.5 else 0
                },
                "visual_ensemble": {
                    "prediction": ensemble_result,
                    "probability": ensemble_prob,
                    "status": 1 if ensemble_prob > 0.5 else 0
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