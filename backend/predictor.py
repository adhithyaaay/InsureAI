import os
import joblib
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models", "xgboost_model.pkl")
saved_data = joblib.load(MODEL_PATH)

model = saved_data["model"]
feature_columns = saved_data["columns"]


def predict_charge(customer):
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

    region_column = f"region_{customer.region}"

    if region_column in data:
        data[region_column] = 1

    input_df = pd.DataFrame([data])

    input_df = input_df[feature_columns]

    prediction = model.predict(input_df)[0]

    return float(prediction)