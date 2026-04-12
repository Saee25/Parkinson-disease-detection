import pandas as pd
import numpy as np
import os
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, mean_absolute_error

# Configuration
DATA_DIR = "data"
MODELS_DIR = os.path.join("backend", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def train_voice_model():
    print("--- Training Voice Model ---")
    data_path = os.path.join(DATA_DIR, "VikasUkani.data")
    if not os.path.exists(data_path):
        print(f"[X] Voice data not found at {data_path}")
        return

    df = pd.read_csv(data_path)
    X = df.drop(['name', 'status'], axis=1)
    y = df['status']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    # Use .values to strip names and avoid errors in API with numpy arrays
    X_train_scaled = scaler.fit_transform(X_train.values)
    X_test_scaled = scaler.transform(X_test.values)

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)

    accuracy = accuracy_score(y_test, model.predict(X_test_scaled))
    print(f"[OK] Voice Model Accuracy: {accuracy * 100:.2f}%")

    joblib.dump(model, os.path.join(MODELS_DIR, "voice_model.pkl"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "voice_scaler.pkl"))
    print(f"[saved] {MODELS_DIR}")

def train_severity_model():
    print("\n--- Training Severity Model ---")
    data_path = os.path.join(DATA_DIR, "LailaQadirMusib.csv")
    if not os.path.exists(data_path):
        print(f"[X] Severity data not found at {data_path}")
        return

    df = pd.read_csv(data_path)
    # We drop non-acoustic features: subject#, age, sex, test_time, total_UPDRS
    X = df.drop(['subject#', 'age', 'sex', 'test_time', 'motor_UPDRS', 'total_UPDRS'], axis=1)
    y = df['motor_UPDRS']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    scaler = StandardScaler()
    # Use .values to strip names
    X_train_scaled = scaler.fit_transform(X_train.values)
    X_test_scaled = scaler.transform(X_test.values)

    model = RandomForestRegressor(n_estimators=100, random_state=42)
    model.fit(X_train_scaled, y_train)

    mae = mean_absolute_error(y_test, model.predict(X_test_scaled))
    print(f"[OK] Severity Model MAE: {mae:.2f}")

    joblib.dump(model, os.path.join(MODELS_DIR, "severity_model.pkl"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "severity_scaler.pkl"))
    print(f"[saved] {MODELS_DIR}")

def train_spiral_model():
    """Spiral CNN only — TensorFlow is imported here so voice/severity can run without TF."""
    print("\n--- Training Spiral CNN Model ---")
    try:
        import tensorflow as tf
        from tensorflow.keras import layers, models
    except ImportError as e:
        print(
            "[X] TensorFlow import failed -- spiral training skipped.\n"
            "   Common causes: broken install (e.g. pywrap_tensorflow), or pip interrupted.\n"
            "   Fix: free several GB disk space, then in this venv run:\n"
            "        pip uninstall tensorflow -y\n"
            "        pip install tensorflow\n"
            f"   Import error was: {e}"
        )
        return False

    train_dir = os.path.join(DATA_DIR, "spiral", "training")
    test_dir = os.path.join(DATA_DIR, "spiral", "testing")

    if not os.path.exists(train_dir):
        print(f"[X] Spiral training data not found at {train_dir}")
        return False

    # Load datasets (match notebooks/Phase3_Visual.ipynb: binary labels, seed, stable test order)
    train_dataset = tf.keras.utils.image_dataset_from_directory(
        train_dir,
        image_size=(100, 100),
        batch_size=16,
        label_mode="binary",
        shuffle=True,
        seed=42,
    )
    test_dataset = tf.keras.utils.image_dataset_from_directory(
        test_dir,
        image_size=(100, 100),
        batch_size=16,
        label_mode="binary",
        shuffle=False,
    )

    # Build CNN
    model = models.Sequential([
        # We don't use Rescaling layer here because backend/utils.py already normalizes
        # This keeps the model input range consistent with inference
        layers.Input(shape=(100, 100, 3)),
        layers.Conv2D(32, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Flatten(),
        layers.Dense(64, activation='relu'),
        layers.Dense(1, activation='sigmoid')
    ])

    model.compile(optimizer='adam',
                  loss='binary_crossentropy',
                  metrics=['accuracy'])

    # Manually normalize the training data since we removed the Rescaling layer
    normalization_layer = layers.Rescaling(1./255)
    train_dataset = train_dataset.map(lambda x, y: (normalization_layer(x), y))
    test_dataset = test_dataset.map(lambda x, y: (normalization_layer(x), y))

    print("Starting CNN training (15 epochs)...")
    model.fit(train_dataset, epochs=15, validation_data=test_dataset, verbose=1)

    loss, accuracy = model.evaluate(test_dataset, verbose=0)
    print(f"[OK] Spiral Model Accuracy: {accuracy * 100:.2f}%")

    model.save(os.path.join(MODELS_DIR, "spiral_model.h5"))
    print(f"[saved] {MODELS_DIR}")
    return True


if __name__ == "__main__":
    train_voice_model()
    train_severity_model()
    spiral_ok = train_spiral_model()
    if spiral_ok:
        print("\n[done] ALL MODELS TRAINED AND SAVED SUCCESSFULLY!")
    else:
        print(
            "\n[done] Voice + severity models were saved.\n"
            "[!] Spiral CNN was not updated -- fix TensorFlow, then run again or train spiral in notebooks/Phase3_Visual.ipynb."
        )
