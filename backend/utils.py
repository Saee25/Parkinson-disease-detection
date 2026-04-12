import io
import os
import subprocess
import tempfile

import cv2
import librosa
import numpy as np
from scipy.stats import kurtosis, skew


def _load_audio_mono(audio_bytes: bytes):
    """
    Load float waveform + sample rate from raw bytes (browser MediaRecorder → WebM/Opus).

    librosa/soundfile cannot decode WebM from BytesIO on Windows without FFmpeg. We try
    BytesIO first (WAV/FLAC), then decode via bundled FFmpeg from imageio-ffmpeg.
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
            ffmpeg_exe,
            "-nostdin",
            "-y",
            "-loglevel",
            "error",
            "-i",
            in_path,
            "-ac",
            "1",
            "-ar",
            "44100",
            "-f",
            "wav",
            out_path,
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

def preprocess_spiral(traces, size=(100, 100)):
    """
    Converts list of strokes/coordinates into a 100x100 grayscale image.
    Traces format: array of strokes, each stroke is array of {x, y, timestamp}
    """
    # Create empty black image
    bg = np.zeros((500, 500), dtype=np.uint8)
    
    for stroke in traces:
        if len(stroke) < 2:
            continue
        points = np.array([[p['x'], p['y']] for p in stroke], dtype=np.int32)
        cv2.polylines(bg, [points], False, 255, thickness=4)
    
    # Resize to model input size
    resized = cv2.resize(bg, size)
    
    # Add channel and batch dimension (1, 100, 100, 3) 
    # Note: Training was on RGB (3 channels)
    rgb = cv2.cvtColor(resized, cv2.COLOR_GRAY2RGB)
    normalized = rgb.astype('float32') / 255.0
    return np.expand_dims(normalized, axis=0)

def preprocess_voice(audio_bytes):
    """
    Extracts acoustic features from raw audio bytes.
    """
    try:
        y, sr = _load_audio_mono(audio_bytes)
    except Exception as e:
        print(f"Failed to load audio: {e}")
        raise ValueError(
            "Could not decode the uploaded recording. "
            "If this persists, run: pip install imageio-ffmpeg (in your venv), then restart the API."
        ) from e
    
    features = []
    
    # Spectral metrics
    stft = np.abs(librosa.stft(y))
    f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'))
    f0 = f0[~np.isnan(f0)]
    
    # 1-3: Fo, Fhi, Flo
    features.append(np.mean(f0) if len(f0) > 0 else 0) # MDVP:Fo(Hz)
    features.append(np.max(f0) if len(f0) > 0 else 0)  # MDVP:Fhi(Hz)
    features.append(np.min(f0) if len(f0) > 0 else 0)  # MDVP:Flo(Hz)
    
    # 4-8: Jitter variants (Approximated via pitch variance)
    jitter = np.std(f0) / np.mean(f0) if len(f0) > 0 else 0
    features.extend([jitter] * 5)
    
    # 9-14: Shimmer variants (Approximated via amplitude variance)
    rms = librosa.feature.rms(y=y)[0]
    shimmer = np.std(rms) / np.mean(rms) if len(rms) > 0 else 0
    features.extend([shimmer] * 6)
    
    # 15-16: NHR, HNR
    harmonic = librosa.effects.harmonic(y)
    noise = y - harmonic
    hnr = 10 * np.log10(np.sum(harmonic**2) / np.sum(noise**2)) if np.sum(noise**2) > 0 else 0
    nhr = 1 / hnr if hnr != 0 else 0
    features.append(nhr)
    features.append(hnr)
    
    # 17-22: Non-linear metrics (RPDE, DFA, etc. - Complex to calculate, using spectral entropy/contrast as proxies)
    features.append(np.mean(librosa.feature.spectral_flatness(y=y))) # RPDE proxy
    features.append(np.mean(librosa.feature.spectral_centroid(y=y))) # DFA proxy
    features.append(skew(rms))   # spread1 proxy
    features.append(kurtosis(rms)) # spread2 proxy
    features.append(np.mean(librosa.feature.poly_features(y=y, order=1))) # D2 proxy
    features.append(np.std(voiced_probs)) # PPE proxy

    return np.array(features).reshape(1, -1)
