import os
import joblib
import pandas as pd
import shap

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "xgboost_model.pkl")
saved_data = joblib.load(MODEL_PATH)

model = saved_data["model"]
feature_columns = saved_data["columns"]

# Initialize TreeExplainer for fast, exact SHAP computation
try:
    explainer = shap.TreeExplainer(model)
    raw_expected = explainer.expected_value
    if hasattr(raw_expected, "__iter__"):
        base_charge = float(raw_expected[0])
    else:
        base_charge = float(raw_expected)
except Exception as e:
    print(f"Warning: Failed to initialize SHAP TreeExplainer: {e}")
    explainer = None
    base_charge = None


def _build_input_df(customer) -> pd.DataFrame:
    data = {
        "age": customer.age,
        "sex": customer.sex,
        "bmi": customer.bmi,
        "children": customer.children,
        "smoker": customer.smoker,
        "region_northeast": 0,
        "region_northwest": 0,
        "region_southeast": 0,
        "region_southwest": 0,
    }

    region_clean = str(customer.region).lower().strip()
    region_column = f"region_{region_clean}"

    if region_column in data:
        data[region_column] = 1

    input_df = pd.DataFrame([data])
    return input_df[feature_columns]


def predict_charge(customer) -> float:
    input_df = _build_input_df(customer)
    prediction = model.predict(input_df)[0]
    return float(prediction)


def predict_and_explain(customer) -> tuple[float, list[dict], float | None]:
    input_df = _build_input_df(customer)
    prediction = float(model.predict(input_df)[0])
    
    explanation = []
    
    if explainer is not None:
        try:
            shap_values = explainer.shap_values(input_df)[0]
            shap_map = dict(zip(feature_columns, shap_values))
            
            # Aggregate region indicators to provide clean combined regional impact
            region_name = str(customer.region).capitalize()
            region_impact = float(
                shap_map.get("region_northeast", 0.0) +
                shap_map.get("region_northwest", 0.0) +
                shap_map.get("region_southeast", 0.0) +
                shap_map.get("region_southwest", 0.0)
            )

            explanation = [
                {
                    "feature": "Smoking Status",
                    "value": "Smoker" if customer.smoker == 1 else "Non-smoker",
                    "impact": round(abs(float(shap_map["smoker"])), 2),
                    "direction": "increase" if shap_map["smoker"] > 0 else "decrease",
                },
                {
                    "feature": "Age",
                    "value": f"{customer.age} yrs",
                    "impact": round(abs(float(shap_map["age"])), 2),
                    "direction": "increase" if shap_map["age"] > 0 else "decrease",
                },
                {
                    "feature": "BMI (Body Mass Index)",
                    "value": round(float(customer.bmi), 1),
                    "impact": round(abs(float(shap_map["bmi"])), 2),
                    "direction": "increase" if shap_map["bmi"] > 0 else "decrease",
                },
                {
                    "feature": "Number of Children",
                    "value": customer.children,
                    "impact": round(abs(float(shap_map["children"])), 2),
                    "direction": "increase" if shap_map["children"] > 0 else "decrease",
                },
                {
                    "feature": "Gender",
                    "value": "Male" if customer.sex == 1 else "Female",
                    "impact": round(abs(float(shap_map["sex"])), 2),
                    "direction": "increase" if shap_map["sex"] > 0 else "decrease",
                },
                {
                    "feature": f"Residential Region ({region_name})",
                    "value": region_name,
                    "impact": round(abs(region_impact), 2),
                    "direction": "increase" if region_impact > 0 else "decrease",
                },
            ]

            # Order factors by magnitude of impact (most decisive drivers first)
            explanation.sort(key=lambda x: x["impact"], reverse=True)

        except Exception as err:
            print(f"Warning: SHAP explanation calculation failed: {err}")
            explanation = []

    return prediction, explanation, base_charge