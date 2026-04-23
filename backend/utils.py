import io
import os
import subprocess
import tempfile


import cv2
import librosa
import numpy as np
import soundfile as sf
import parselmouth
import torch
import base64
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
    Returns (tensor, original_rgb_uint8)
    """
    # Initialize a white background (255)
    bg = np.ones((500, 500), dtype=np.uint8) * 255
   
    for stroke in traces:
        if len(stroke) < 2:
            continue
        points = np.array([[p['x'], p['y']] for p in stroke], dtype=np.int32)
        # Draw black lines (0) on the white background with anti-aliasing
        cv2.polylines(bg, [points], False, 0, thickness=4, lineType=cv2.LINE_AA)
   
    resized = cv2.resize(bg, size, interpolation=cv2.INTER_LINEAR)
    rgb = cv2.cvtColor(resized, cv2.COLOR_GRAY2RGB)
   
    # Save a copy for Grad-CAM overlay
    original_rgb = rgb.copy()
   
    normalized = rgb.astype('float32') / 255.0
   
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    normalized = (normalized - mean) / std
   
    transposed = np.transpose(normalized, (2, 0, 1))
    tensor = np.expand_dims(transposed, axis=0)
   
    return tensor, original_rgb




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


def preprocess_uploaded_image(image_bytes, size=(224, 224)):
    """
    Cleans a raw smartphone photo using OpenCV.
    Matches the PyTorch transforms Pipeline USED DURING TRAINING exactly:
    - Load RGB image
    - Resize to 224x224
    - Convert to float32 [0.0, 1.0]
    - Normalize (ImageNet mean & std)
    """
    # 1. Decode raw bytes into an OpenCV image array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
   
    if img is None:
        raise ValueError("Could not decode the uploaded image.")


    # 2. Convert to RGB to match torchvision ImageFolder PIL loading
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


    # 3. Resize to fit PyTorch ResNet18 (mimic torchvision INTER_LINEAR)
    resized = cv2.resize(rgb, size, interpolation=cv2.INTER_LINEAR)


    # Save a copy for Grad-CAM overlay
    original_rgb = resized.copy()


    # 4. Apply standard ImageNet Normalization
    normalized = resized.astype('float32') / 255.0
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    normalized = (normalized - mean) / std


    # 5. Transpose for PyTorch (Channels, Height, Width) and add Batch dimension
    transposed = np.transpose(normalized, (2, 0, 1))
    tensor = np.expand_dims(transposed, axis=0)
   
    return tensor, original_rgb


def get_gradcam_heatmap(model, input_tensor, original_image):
    """
    Generates a Grad-CAM heatmap overlayed on the original image.
    Returns a base64 encoded PNG string.
    """
    model.eval()
   
    # We want to target the last convolutional layer in ResNet18
    target_layer = model.layer4
   
    activations = []
    gradients = []


    def forward_hook(module, input, output):
        activations.append(output)


    def backward_hook(module, grad_input, grad_output):
        # Full backward hook returns a tuple of gradients
        gradients.append(grad_output[0])


    h1 = target_layer.register_forward_hook(forward_hook)
    h2 = target_layer.register_full_backward_hook(backward_hook)


    # Convert numpy to torch tensor if needed
    if isinstance(input_tensor, np.ndarray):
        input_tensor = torch.from_numpy(input_tensor)
   
    # Ensure gradients are enabled for this specific tensor
    input_tensor = input_tensor.clone().detach().requires_grad_(True)


    # Enable gradients globally for this calculation
    with torch.set_grad_enabled(True):
        # Forward pass
        model.zero_grad()
        output = model(input_tensor)
       
        # Backward pass
        # Since it's binary with Sigmoid, we backprop the probability score
        output.backward()


    if not gradients or not activations:
        h1.remove()
        h2.remove()
        return None


    # Process Grad-CAM (using the last activation/gradient captured)
    grads = gradients[-1]
    acts = activations[-1]
   
    weights = torch.mean(grads, dim=(2, 3), keepdim=True)
    cam = torch.sum(weights * acts, dim=1, keepdim=True)
    cam = torch.relu(cam)
   
    # Upsample and normalize
    cam = torch.nn.functional.interpolate(cam, size=(224, 224), mode='bilinear', align_corners=False)
    cam = cam.squeeze().detach().cpu().numpy()
   
    # Handle division by zero
    denom = (cam.max() - cam.min())
    if denom == 0:
        cam = np.zeros_like(cam)
    else:
        cam = (cam - cam.min()) / denom
   
    # Cleanup hooks
    h1.remove()
    h2.remove()


    # Apply colormap and overlay
    heatmap = cv2.applyColorMap(np.uint8(255 * cam), cv2.COLORMAP_JET)
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
   
    # Overlay (0.6 original, 0.4 heatmap)
    overlayed = cv2.addWeighted(original_image, 0.6, heatmap, 0.4, 0)
   
    # Convert to Base64
    _, buffer = cv2.imencode('.png', cv2.cvtColor(overlayed, cv2.COLOR_RGB2BGR))
    base64_str = base64.b64encode(buffer).decode('utf-8')
   
    return f"data:image/png;base64,{base64_str}"
