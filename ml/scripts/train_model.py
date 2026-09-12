import os
import sys
import shutil
from datetime import datetime, timezone
import joblib
import pandas as pd

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score
from xgboost import XGBRegressor

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATASET_PATH = os.path.join(BASE_DIR, "dataset", "insurance.csv")
MODEL_DEST = os.path.join(BASE_DIR, "backend", "models", "xgboost_model.pkl")
BACKUP_DEST = os.path.join(BASE_DIR, "backend", "models", "xgboost_model_v1_backup.pkl")

def main():
    print("=" * 60)
    print("InsureAI - Production Model Training Pipeline (XGBoost)")
    print("=" * 60)
    
    # Load dataset
    print(f"Loading dataset: {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)

    # Encode binary columns
    df["sex"] = df["sex"].map({"male": 1, "female": 0})
    df["smoker"] = df["smoker"].map({"yes": 1, "no": 0})

    # One-hot encode region
    df = pd.get_dummies(df, columns=["region"], dtype=int)

    # Ensure canonical feature order
    feature_columns = [
        "age", "sex", "bmi", "children", "smoker",
        "region_northeast", "region_northwest", "region_southeast", "region_southwest"
    ]

    # Features and target
    X = df[feature_columns]
    y = df["charges"]

    # Split dataset (80/20 with reproducible seed 42)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # Initialize champion XGBoost model
    model = XGBRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=4,
        random_state=42
    )

    # Train model
    print("Training XGBoost Regressor...")
    model.fit(X_train, y_train)
    print("Model trained successfully.")

    # Predict & evaluate
    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = root_mean_squared_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    print(f"\nModel Performance Metrics:")
    print(f"  Mean Absolute Error (MAE) : INR {mae:.2f}")
    print(f"  Root Mean Squared Error   : INR {rmse:.2f}")
    print(f"  R² Score                  : {r2:.4f}")

    # Backup existing model if it exists
    if os.path.exists(MODEL_DEST) and not os.path.exists(BACKUP_DEST):
        shutil.copy2(MODEL_DEST, BACKUP_DEST)
        print(f"\nExisting production model backed up to: {BACKUP_DEST}")

    # Save model bundle with full reproducibility metadata
    model_bundle = {
        "model": model,
        "columns": feature_columns,
        "version": "2.0",
        "algorithm": "XGBoost Regressor",
        "metrics": {
            "mae": round(float(mae), 2),
            "rmse": round(float(rmse), 2),
            "r2": round(float(r2), 4)
        },
        "trained_at": datetime.now(timezone.utc).isoformat()
    }

    os.makedirs(os.path.dirname(MODEL_DEST), exist_ok=True)
    joblib.dump(model_bundle, MODEL_DEST)
    print(f"Production model bundle saved to: {MODEL_DEST}")
    print("Training pipeline finished successfully.")

if __name__ == "__main__":
    main()