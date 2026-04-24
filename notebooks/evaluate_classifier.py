import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import accuracy_score, confusion_matrix
import joblib

df = pd.read_csv('../data/VikasUkani.data')

X = df.drop(['name', 'status'], axis=1)
y = df['status']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

log_model = LogisticRegression(max_iter=1000, random_state=42)
svm_model = SVC(kernel='linear', probability=True, random_state=42)
rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
voting_model = VotingClassifier(
    estimators=[('log', log_model), ('svm', svm_model), ('rf', rf_model)],
    voting='soft'
)

models = {
    'Logistic Regression': log_model,
    'Support Vector Machine (SVM)': svm_model,
    'Random Forest': rf_model,
    'Ensemble (Combined)': voting_model
}

best_accuracy = 0
best_model = None
best_name = ""

print("--- CLASSIFIER EVALUATION ---")
for name, model in models.items():
    model.fit(X_train_scaled, y_train)
    preds = model.predict(X_test_scaled)
    acc = accuracy_score(y_test, preds)
    
    print(f"\n{name}:")
    print(f"  Accuracy: {acc * 100:.2f}%")
    
    if acc > best_accuracy:
        best_accuracy = acc
        best_model = model
        best_name = name

print(f"\nBest Model: {best_name} with Accuracy: {best_accuracy*100:.2f}%")
