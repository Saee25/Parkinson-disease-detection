# Parkinson Disease Detection (Multi-Modal Hybrid System)

A state-of-the-art screening tool that combines **acoustic voice analysis**, **spiral drawing patterns**, and **rhythmic wave analysis** into a unified diagnostic ensemble. The system features a hybrid input pipeline, allowing users to either trace digitally on-screen or upload photos of hand-drawn sketches on physical paper.

> [!IMPORTANT]
> This project is for **educational and research prototyping only**. It is **not** a medical device and **must not** be used as a substitute for professional clinical diagnosis or treatment.

---

## 🌟 Key Features

- **Triple-Modality Screening**:
    - **Voice Analysis**: Extracts 26+ acoustic features (Jitter, Shimmer, HNR, etc.) from a 10-second "Ahhh" phonation.
    - **Spiral Test**: Analyzes Archimedean spiral patterns for micro-tremors and motor instability.
    - **Wave Test**: Analyzes rhythmic sine-wave drawings for bradykinesia and coordination.
- **Hybrid Input Pipeline**:
    - **Digital Canvas**: Real-time coordinate tracking and stroke analysis.
    - **Physical Upload**: Upload smartphone photos of paper drawings. The backend uses **OpenCV Adaptive Thresholding** to strip shadows and lighting noise for clinical-grade cleaning.
- **Advanced AI Core**:
    - **ResNet18 (PyTorch)**: Pre-trained deep learning vision models for drawing analysis.
    - **Random Forest (Scikit-Learn)**: Clinical feature classifiers for voice and severity.
- **Diagnostic Ensemble**: Combines multiple independent classifiers into a final consensus score to reduce false positives.
- **High-Confidence Threshold (0.70)**: Optimized to handle domain shifts between digital inputs and physical paper.

---

## 📂 Repository Layout

| Path | Purpose |
|------|---------|
| `backend/` | FastAPI API (`main.py`) and OpenCV/Praat preprocessing (`utils.py`) |
| `frontend/` | React 19 + Tailwind CSS 4 Dashboard |
| `notebooks/` | Jupyter Research: Voice (P1), Severity (P2), Spiral (P3), and Wave (P4) |
| `backend/models/`| Trained weights (`.pth` for ResNet, `.pkl` for Random Forest) |
| `data/` | Multi-modal training datasets (Voice, Spiral, and Wave) |

---

## 🛠️ Tech Stack

- **Backend**: Python 3.10+, FastAPI, PyTorch (ResNet18), OpenCV (Vision Processing), Parselmouth-Praat (Acoustic Analysis), Scikit-Learn.
- **Frontend**: React 19, Vite, Tailwind CSS 4, Lucide Icons, Framer Motion (Animations).
- **Processing**: Adaptive Thresholding, ImageNet Normalization, FFT-based Voice Processing.

---

## 🚀 Getting Started

### 1. Environment Setup
```powershell
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r backend\requirements.txt

# Install frontend dependencies
cd frontend
npm install
```

### 2. Run the Application
**Start Backend (Port 8000):**
```powershell
.\start-backend.ps1
```

**Start Frontend (Port 5173):**
```powershell
cd frontend
npm run dev
```

---

## 📊 Evaluation Logic
The system uses a **0.70 (70%) detection threshold** to provide a high-confidence clinical screening. 

1. **Individual Scores**: Probabilities for Spiral, Wave, and Voice are calculated separately.
2. **Visual Ensemble**: The average of Spiral and Wave results to provide a "Drawing Consensus."
3. **Diagnostic Synthesis**: A high-level summary that compares all modalities (e.g., "High Agreement" vs "Mixed Signals").
4. **UPDRS Severity**: A predicted motor severity score based on vocal stability features.

---

## 🧪 Research & Training
Full research workflows, including transfer learning for the ResNet18 models, are available in the `notebooks/` directory. You can retrain the clinical classifiers using `python train_models.py`.

---

## 📜 License
This project is for research and demonstration purposes. Datasets are sourced from public Parkinson's research repositories (Vikas Ukani, Laila Qadir Musib, and Brazilian PD datasets).
