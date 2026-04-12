import joblib
import tensorflow as tf
import os

def check_models():
    base_path = os.path.join("backend", "models")
    models = ["voice_model.pkl", "severity_model.pkl", "spiral_model.h5"]
    
    for model_file in models:
        path = os.path.join(base_path, model_file)
        if not os.path.exists(path):
            print(f"❌ Missing: {path}")
            continue
            
        try:
            if model_file.endswith(".pkl"):
                model = joblib.load(path)
            else:
                model = tf.keras.models.load_model(path)
            print(f"✅ Loaded: {model_file}")
        except Exception as e:
            print(f"❌ Failed to load {model_file}: {e}")

if __name__ == "__main__":
    check_models()
