import time
print("Starting imports (this may take a minute due to OneDrive/disk speed)...")

start_time = time.time()
import pandas as pd
print(f"[OK] pandas imported in {time.time() - start_time:.2f} seconds")

start_time = time.time()
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
print(f"[OK] sklearn imported in {time.time() - start_time:.2f} seconds")

print("\n--- Starting Data Processing ---")
# 1. Load Dataset
df2 = pd.read_csv('data/LailaQadirMusib.csv')
print('Dataset shape:', df2.shape)
print('Columns:', list(df2.columns))

# 2. Define Features (X) and Target (y)
X_reg = df2.drop(['subject#', 'age', 'sex', 'test_time', 'motor_UPDRS', 'total_UPDRS'], axis=1)
y_reg = df2['motor_UPDRS']

print(f'\nFeatures used ({len(X_reg.columns)} columns):')
for i, col in enumerate(X_reg.columns):
    print(f'  {i}: {col}')
print(f'\nTarget range: {y_reg.min():.2f} to {y_reg.max():.2f}')

# 3. Split the data
X_train_reg, X_test_reg, y_train_reg, y_test_reg = train_test_split(
    X_reg, y_reg, test_size=0.2, random_state=42
)

# 4. Scale the Features
scaler_reg = StandardScaler()
X_train_reg_scaled = scaler_reg.fit_transform(X_train_reg.values)
X_test_reg_scaled  = scaler_reg.transform(X_test_reg.values)

# 5. Train the Random Forest Regressor
print("\nTraining the Random Forest Regressor (this may also take a moment)...")
rf_regressor = RandomForestRegressor(n_estimators=100, random_state=42)
rf_regressor.fit(X_train_reg_scaled, y_train_reg)
print("[OK] Training complete")

# 6. Test the Model
reg_preds = rf_regressor.predict(X_test_reg_scaled)

# 7. Evaluate the Results
mae = mean_absolute_error(y_test_reg, reg_preds)
r2  = r2_score(y_test_reg, reg_preds)

print("\n--- MODULE 2: SEVERITY TRACKER (Random Forest Regressor) ---")
print(f"Mean Absolute Error (MAE): {mae:.2f}  <- avg error in UPDRS points")
print(f"R-squared Score:           {r2 * 100:.2f}%  <- how much variance is explained")
print("\nNote: The saved severity_model.pkl was trained with these exact same settings.")
