import io
import os
import subprocess
import tempfile

import cv2
import librosa
import numpy as np
import soundfile as sf
import parselmouth
from parselmouth.praat import call
from scipy.stats import kurtosis, skew


def _load_audio_mono(audio_bytes: bytes):
    """
    Load float waveform + sample rate from raw bytes (browser MediaRecorder → WebM/Opus).
    """
    print(f"Loading audio from buffer ({len(audio_bytes)} bytes)...")
    if not audio_bytes or len(audio_bytes) < 100:
        raise ValueError("Audio buffer is empty or too small.")

    try:
        y, sr = librosa.load(io.BytesIO(audio_bytes), sr=None)
        print(f"Audio loaded: {len(y)} samples at {sr}Hz")
        return y, sr
    except Exception as first_err:
        print(f"Direct decode failed ({first_err!r}); trying FFmpeg...")

    try:
        import imageio_ffmpeg
    except ImportError as e:
        raise ValueError(
            "Could not decode browser audio (e.g. WebM). Install backend deps: "
            "pip install imageio-ffmpeg"
        ) from e

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    fd_in, in_path = tempfile.mkstemp(suffix=".webm")
    fd_out, out_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd_out)
    try:
        with os.fdopen(fd_in, "wb") as f_in:
            f_in.write(audio_bytes)
        cmd = [
            ffmpeg_exe, "-nostdin", "-y", "-loglevel", "error",
            "-i", in_path, "-ac", "1", "-ar", "44100", "-f", "wav", out_path,
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            raise RuntimeError(proc.stderr or proc.stdout or "ffmpeg failed")

        y, sr = librosa.load(out_path, sr=None)
        print(f"Audio loaded (via FFmpeg): {len(y)} samples at {sr}Hz")
        return y, sr
    finally:
        for p in (in_path, out_path):
            try:
                if p and os.path.isfile(p):
                    os.remove(p)
            except OSError:
                pass


def preprocess_spiral(traces, size=(224, 224)):
    """
    Converts list of strokes/coordinates into a 224x224 RGB image
    and applies ImageNet normalization for ResNet18 (PyTorch).
    """
    bg = np.zeros((500, 500), dtype=np.uint8)
    
    for stroke in traces:
        if len(stroke) < 2:
            continue
        points = np.array([[p['x'], p['y']] for p in stroke], dtype=np.int32)
        cv2.polylines(bg, [points], False, 255, thickness=4)
    
    resized = cv2.resize(bg, size)
    rgb = cv2.cvtColor(resized, cv2.COLOR_GRAY2RGB)
    normalized = rgb.astype('float32') / 255.0
    
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    normalized = (normalized - mean) / std
    
    transposed = np.transpose(normalized, (2, 0, 1))
    return np.expand_dims(transposed, axis=0)


def preprocess_voice(audio_bytes):
    """
    Extracts 22 clinical acoustic features using Praat (Parselmouth) to match 
    the training dataset algorithms exactly.
    """
    try:
        y, sr = _load_audio_mono(audio_bytes)
        
        # Save temp WAV for Praat to read
        temp_wav = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        sf.write(temp_wav.name, y, sr)
        temp_wav.close()
        
        # Load into Praat
        snd = parselmouth.Sound(temp_wav.name)
    except Exception as e:
        print(f"Failed to load audio for Praat: {e}")
        raise ValueError("Could not decode the uploaded recording.") from e

    # Calculate Pitch
    pitch = snd.to_pitch()
    f0_arr = pitch.selected_array['frequency']
    f0_arr = f0_arr[f0_arr > 0] # Remove unvoiced zeros

    Fo = np.mean(f0_arr) if len(f0_arr) > 0 else 0
    Fhi = np.max(f0_arr) if len(f0_arr) > 0 else 0
    Flo = np.min(f0_arr) if len(f0_arr) > 0 else 0

    # Calculate Jitter & Shimmer using Praat PointProcess
    pointProcess = call(snd, "To PointProcess (periodic, cc)", 75, 500)
    
    try:
        # Jitter metrics
        localJitter = call(pointProcess, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
        absoluteJitter = call(pointProcess, "Get jitter (local, absolute)", 0, 0, 0.0001, 0.02, 1.3)
        rapJitter = call(pointProcess, "Get jitter (rap)", 0, 0, 0.0001, 0.02, 1.3)
        ppq5Jitter = call(pointProcess, "Get jitter (ppq5)", 0, 0, 0.0001, 0.02, 1.3)
        ddpJitter = rapJitter * 3

        # Shimmer metrics
        localShimmer = call([snd, pointProcess], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        localdbShimmer = call([snd, pointProcess], "Get shimmer (local_dB)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        apq3Shimmer = call([snd, pointProcess], "Get shimmer (apq3)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        apq5Shimmer = call([snd, pointProcess], "Get shimmer (apq5)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        apq11Shimmer = call([snd, pointProcess], "Get shimmer (apq11)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        ddaShimmer = apq3Shimmer * 3
    except Exception:
        # Fallback if voice is too quiet/noisy for Praat to find periodic cycles
        localJitter = absoluteJitter = rapJitter = ppq5Jitter = ddpJitter = 0.0
        localShimmer = localdbShimmer = apq3Shimmer = apq5Shimmer = apq11Shimmer = ddaShimmer = 0.0

    # Calculate Harmonics
    try:
        harmonicity = call(snd, "To Harmonicity (cc)", 0.01, 75, 0.1, 1.0)
        HNR = call(harmonicity, "Get mean", 0, 0)
        NHR = 1 / HNR if HNR > 0 else 0
    except Exception:
        HNR = 0.0
        NHR = 0.0

    # Calculate non-linear proxies (Librosa is fine for these last 6)
    rms = librosa.feature.rms(y=y)[0]
    voiced_probs = librosa.pyin(y, fmin=75, fmax=500)[2]
    
    rpde_p = np.mean(librosa.feature.spectral_flatness(y=y))
    dfa_p = np.mean(librosa.feature.spectral_centroid(y=y))
    s1_p = skew(rms)
    s2_p = kurtosis(rms)
    d2_p = np.mean(librosa.feature.poly_features(y=y, order=1))
    ppe_p = np.std(voiced_probs) if voiced_probs is not None else 0

    # Clean up temp file
    if os.path.exists(temp_wav.name):
        os.remove(temp_wav.name)

    # Build the exact 22-feature array
    features = [
        Fo, Fhi, Flo,
        localJitter, absoluteJitter, rapJitter, ppq5Jitter, ddpJitter,
        localShimmer, localdbShimmer, apq3Shimmer, apq5Shimmer, apq11Shimmer, ddaShimmer,
        NHR, HNR,
        rpde_p, dfa_p, s1_p, s2_p, d2_p, ppe_p
    ]

    # --- DEBUG PRINTS ---
    print("\n--- CLINICAL (PRAAT) FEATURE DEBUG ---")
    print(f"  Fundamental Freq (Fo): {Fo:.2f} Hz")
    print(f"  Jitter (local):        {localJitter*100:.4f}%")
    print(f"  Shimmer (local):       {localShimmer*100:.4f}%")
    print(f"  HNR:                   {HNR:.2f} dB")
    print("--------------------------------------\n")

    return np.array(features).reshape(1, -1)