import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from xgboost import XGBRegressor


def main():
    # Load dataset
    df = pd.read_csv("../../dataset/insurance.csv")

    # Encode binary columns
    df["sex"] = df["sex"].map({"male": 1, "female": 0})
    df["smoker"] = df["smoker"].map({"yes": 1, "no": 0})

    # One-hot encode region
    df = pd.get_dummies(df, columns=["region"], dtype=int)

    # Features and target
    X = df.drop("charges", axis=1)
    y = df["charges"]

    # Split dataset
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42
    )

    # Create model
    model = XGBRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=4,
        random_state=42
    )

    # Train model
    model.fit(X_train, y_train)

    print("🎉 Model trained successfully!")

    # Predict
    predictions = model.predict(X_test)

    # Compare predictions
    comparison = pd.DataFrame({
        "Actual": y_test.values,
        "Predicted": predictions
    })

    print("\nFirst 10 Predictions")
    print(comparison.head(10))

    # Evaluate
    mae = mean_absolute_error(y_test, predictions)
    r2 = r2_score(y_test, predictions)

    print(f"\nMean Absolute Error : {mae:.2f}")
    print(f"R² Score            : {r2:.4f}")

    # Save model and feature names
    feature_columns = X.columns.tolist()

    joblib.dump(
    {
        "model": model,
        "columns": feature_columns,
        "version": "1.0",
        "algorithm": "XGBoost"
    },
    "../../backend/models/xgboost_model.pkl"
)
    print("\n✅ Model saved successfully!")


if __name__ == "__main__":
    main()