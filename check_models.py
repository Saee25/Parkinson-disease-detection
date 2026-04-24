"""
check_models.py -- Validates all trained model files load correctly.

Checks:
  voice_model.pkl     -- GradientBoostingClassifier (scikit-learn)
  voice_scaler.pkl    -- StandardScaler
  severity_model.pkl  -- GradientBoostingRegressor (scikit-learn)
  severity_scaler.pkl -- StandardScaler
  spiral_resnet18.pth -- ResNet18, targeted ensemble head (layer4, 128-neuron)
  wave_resnet18.pth   -- ResNet18, v3 wider head (layer3+4, 256->64->1 GELU)
"""

import os
import sys
import joblib
import torch
import torch.nn as nn
from torchvision import models as pt_models

# Force UTF-8 output so non-ASCII characters work on Windows terminals
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass  # Python < 3.7

BASE_PATH = os.path.join("backend", "models")


# ─────────────────────────────────────────────────────────────────────────────
# Helpers -- separate loaders for each model's unique head architecture
# ─────────────────────────────────────────────────────────────────────────────

def _load_spiral_resnet18(path):
    """
    Spiral: targeted ensemble head (train_spiral_targeted.py)
    Architecture: layer4 unfrozen, head = 512 -> 128 -> 1 (ReLU)
    """
    model = pt_models.resnet18(weights=None)
    num_ftrs = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Linear(num_ftrs, 128),
        nn.ReLU(),
        nn.Dropout(0.35),
        nn.Linear(128, 1)
    )
    state = torch.load(path, map_location="cpu")
    model.load_state_dict(state, strict=False)
    model.eval()
    return model


def _load_wave_resnet18(path):
    """
    Wave: v3 wider head (train_models.py v3)
    Architecture: layer3+4 unfrozen, head = 512 -> 256 -> 64 -> 1 (GELU)
    """
    model = pt_models.resnet18(weights=None)
    num_ftrs = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Linear(num_ftrs, 256),
        nn.GELU(),
        nn.Dropout(0.4),
        nn.Linear(256, 64),
        nn.GELU(),
        nn.Dropout(0.2),
        nn.Linear(64, 1)
    )
    state = torch.load(path, map_location="cpu")
    model.load_state_dict(state, strict=False)
    model.eval()
    return model


# ─────────────────────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────────────────────

def check_models():
    print()
    print("=" * 50)
    print("  Parkinson's Detection -- Model Health Check")
    print("=" * 50)
    print()

    checks = [
        ("voice_model.pkl",     lambda p: joblib.load(p)),
        ("voice_scaler.pkl",    lambda p: joblib.load(p)),
        ("severity_model.pkl",  lambda p: joblib.load(p)),
        ("severity_scaler.pkl", lambda p: joblib.load(p)),
        ("spiral_resnet18.pth", lambda p: _load_spiral_resnet18(p)),
        ("wave_resnet18.pth",   lambda p: _load_wave_resnet18(p)),
    ]

    all_ok = True
    for filename, loader in checks:
        path = os.path.join(BASE_PATH, filename)
        if not os.path.exists(path):
            print(f"  [MISSING] {filename}")
            all_ok = False
            continue
        try:
            loader(path)
            size_mb = os.path.getsize(path) / 1e6
            print(f"  [OK]      {filename:<30} ({size_mb:.1f} MB)")
        except Exception as e:
            print(f"  [FAIL]    {filename} --> {e}")
            all_ok = False

    print()
    if all_ok:
        print("  [OK] All models loaded successfully. Backend is ready.")
    else:
        print("  [WARN] Some models are missing or corrupt.")
        print("         Run `python train_models.py` to regenerate them.")
        print("         For spiral specifically: `python train_spiral_targeted.py`")
    print()


if __name__ == "__main__":
    check_models()
