from pydantic import BaseModel


class Customer(BaseModel):
    age: int
    sex: int
    bmi: float
    children: int
    smoker: int
    region: str


class PredictionResponse(BaseModel):
    predicted_charge: float
    risk_level: str
    recommendation: str