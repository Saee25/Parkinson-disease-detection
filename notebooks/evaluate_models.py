import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, VotingRegressor
from sklearn.svm import SVR
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

df2 = pd.read_csv('../data/LailaQadirMusib.csv')

X_reg = df2.drop(['subject#', 'age', 'sex', 'test_time', 'motor_UPDRS', 'total_UPDRS'], axis=1)
y_reg = df2['motor_UPDRS']

X_train_reg, X_test_reg, y_train_reg, y_test_reg = train_test_split(
    X_reg, y_reg, test_size=0.2, random_state=42
)

scaler_reg = StandardScaler()
X_train_reg_scaled = scaler_reg.fit_transform(X_train_reg.values)
X_test_reg_scaled  = scaler_reg.transform(X_test_reg.values)

rf = RandomForestRegressor(n_estimators=100, random_state=42)
gb = GradientBoostingRegressor(n_estimators=100, random_state=42)
svr = SVR(kernel='rbf', C=100, gamma=0.1)

models = {
    'Random Forest': rf,
    'Gradient Boosting': gb,
    'Support Vector Regressor': svr,
    'Ensemble (Combined)': VotingRegressor([('rf', rf), ('gb', gb), ('svr', svr)])
}

results = {}
best_model = None
best_r2 = -float('inf')
best_name = ""

for name, model in models.items():
    model.fit(X_train_reg_scaled, y_train_reg)
    preds = model.predict(X_test_reg_scaled)
    mae = mean_absolute_error(y_test_reg, preds)
    r2 = r2_score(y_test_reg, preds)
    results[name] = {'MAE': mae, 'R2': r2}
    
    if r2 > best_r2:
        best_r2 = r2
        best_model = model
        best_name = name

print("--- MODEL EVALUATION ---")
for name, metrics in results.items():
    print(f"{name}:")
    print(f"  MAE: {metrics['MAE']:.2f}")
    print(f"  R2 : {metrics['R2']*100:.2f}%")

print(f"\nBest Model: {best_name} with R2: {best_r2*100:.2f}%")
joblib.dump(best_model, 'severity_model.pkl')
joblib.dump(scaler_reg, 'severity_scaler.pkl')
print("Best model and scaler saved.")
