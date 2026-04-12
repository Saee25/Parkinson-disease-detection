# Parkinson Disease Detection

Full-stack screening demo that combines **hand-drawn spiral traces** and **browser-recorded voice** into a single analysis request. A **FastAPI** backend loads scikit-learn and TensorFlow models; a **React + Vite** frontend captures tests and displays combined results (including an informational motor-severity-style score).

> **Important:** This project is for **education and research prototyping only**. It is **not** a medical device and **must not** be used as a substitute for professional diagnosis or treatment.

---

## Features

- **Spiral drawing test** — Canvas strokes are sent as JSON; the backend rasterizes traces and runs a CNN (`spiral_model.h5`).
- **Voice analysis** — MediaRecorder audio (e.g. WebM) is uploaded; **librosa** extracts acoustic-style features; a **Random Forest** classifier predicts healthy vs Parkinsonian patterns (`voice_model.pkl` + `voice_scaler.pkl`).
- **Severity estimate** — A separate regressor maps a subset of voice features to a **motor UPDRS–style score** for display only (`severity_model.pkl` + `severity_scaler.pkl`).
- **Accessibility-oriented UI** — Dashboard copy references WCAG-minded layout; Tailwind CSS for styling.

---

## Repository layout

| Path | Purpose |
|------|---------|
| `backend/` | FastAPI app (`main.py`), preprocessing (`utils.py`), trained artifacts in `backend/models/` |
| `frontend/` | React 19 + Vite 5 + Tailwind 4 SPA |
| `data/` | Training CSVs used by `train_models.py` (voice + severity); spiral images expected under `data/spiral/training` and `data/spiral/testing` if you train the CNN locally |
| `notebooks/` | Jupyter workflows: Phase1 (voice), Phase2 (severity), Phase3 (visual/spiral) |
| `train_models.py` | Retrain voice, severity, and (if data + TensorFlow exist) spiral models into `backend/models/` |
| `check_models.py` | Quick smoke test that model files load |
| `start-backend.ps1` | Windows helper: activates `venv` and runs Uvicorn on port 8000 |

---

## Tech stack

**Backend:** Python 3.x, FastAPI, Uvicorn, NumPy, OpenCV, librosa, scipy, scikit-learn, joblib, TensorFlow, pandas, `python-multipart`, `imageio-ffmpeg` (helps decode browser WebM on Windows).

**Frontend:** React 19, Vite 5, Tailwind CSS 4, Lucide icons.

---

## Prerequisites

- **Python 3.10+** (project has been used with 3.13; match your TensorFlow wheel availability).
- **Node.js 18+** and npm (for the frontend).
- **Git** (and a GitHub account).

---

## Setup

### 1. Clone and enter the project

```bash
cd ParkinsonDiseaseDetection
```

### 2. Python virtual environment (from repo root)

**Windows (PowerShell):**

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

**macOS / Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

### 3. Frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Trained models

Pretrained files are expected under `backend/models/`:

- `voice_model.pkl`, `voice_scaler.pkl`
- `severity_model.pkl`, `severity_scaler.pkl`
- `spiral_model.h5`

If anything is missing or corrupt, run training (see below) or restore files from backup.

**Optional — keep Git history small:** The root `.gitignore` includes commented lines to ignore `*.pkl` / `*.h5` under `backend/models/`. Uncomment them if you prefer clones to run `python train_models.py` instead of committing large binaries.

---

## Run locally

### Backend (port **8000**)

From the **repository root** (with `venv` activated):

**Windows:**

```powershell
.\start-backend.ps1
```

**Or manually:**

```powershell
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

**Alternative:** `cd backend` then `python main.py` (same host/port, no `--reload`).

### Frontend (Vite dev server, usually **5173**)

```bash
cd frontend
npm run dev
```

Open the URL printed in the terminal (typically `http://localhost:5173`).

### API base URL

The frontend reads `VITE_API_URL` or defaults to `http://localhost:8000` (`frontend/src/config.js`). For a custom backend URL:

```bash
# example: frontend/.env.local
VITE_API_URL=http://127.0.0.1:8000
```

---

## Verify the backend

| Endpoint | Description |
|----------|-------------|
| `GET http://127.0.0.1:8000/` | Simple JSON: API online |
| `GET http://127.0.0.1:8000/health` | `models_loaded` + `status` (`ok` or `degraded`) |
| `GET http://127.0.0.1:8000/docs` | Swagger UI |
| `POST http://127.0.0.1:8000/analyze/full` | Multipart: `spiralData` (JSON string), `voiceBlob` (file) |

Example:

```bash
curl http://127.0.0.1:8000/health
```

---

## Retrain models

From repo root with `venv` activated:

```bash
python train_models.py
```

- **Voice** uses `data/VikasUkani.data`.
- **Severity** uses `data/LailaQadirMusib.csv`.
- **Spiral CNN** runs only if `data/spiral/training` and `data/spiral/testing` exist and TensorFlow imports cleanly; otherwise voice + severity still save and the script tells you how to fix spiral training.

Sanity-check loads:

```bash
python check_models.py
```

---

## GitHub: create repo and push (first time)

Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and the new repository name.

### A. Create an empty repository on GitHub (website)

1. Log in at [github.com](https://github.com).
2. Click **+** → **New repository**.
3. Name it (e.g. `parkinson-disease-detection`), choose **Public** or **Private**.
4. **Do not** add a README, `.gitignore`, or license *if* you already have a local project you want to push as-is (avoids merge conflicts).  
5. Click **Create repository**. GitHub will show you URLs — copy the **HTTPS** URL, e.g. `https://github.com/YOUR_USERNAME/YOUR_REPO.git`.

### B. Initialize Git and push from your PC

In **PowerShell**, from your project folder (where this `README.md` lives):

```powershell
cd path\to\ParkinsonDiseaseDetection

git init
git add .
git commit -m "Initial commit: Parkinson detection web app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

On first `git push`, GitHub may prompt you to sign in: use a **Personal Access Token** as the password if HTTPS + password is disabled (GitHub’s current default).

### If GitHub already created a README on the remote

If you initialized the repo **with** a README on the website, use:

```powershell
git pull origin main --allow-unrelated-histories
# resolve any conflicts, then:
git push -u origin main
```

### Optional: GitHub CLI (`gh`)

If you use [GitHub CLI](https://cli.github.com/):

```powershell
gh auth login
gh repo create YOUR_REPO --private --source=. --remote=origin --push
```

---

## License

Add a `LICENSE` file if you plan to open-source this project; until then, all rights reserved unless you state otherwise.

---

## Acknowledgments

Datasets under `data/` and experiment notebooks under `notebooks/` support the training pipeline described in this README. Spiral CNN architecture and training flow align with `notebooks/Phase3_Visual.ipynb`.
