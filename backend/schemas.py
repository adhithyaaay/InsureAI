from typing import Any, List, Literal, Optional, Union
from pydantic import BaseModel


class Customer(BaseModel):
    age: int
    sex: int
    bmi: float
    children: int
    smoker: int
    region: str


class FeatureImpact(BaseModel):
    feature: str
    value: Union[str, int, float]
    impact: float
    direction: Literal["increase", "decrease"]


class PredictionResponse(BaseModel):
    predicted_charge: float
    risk_level: str
    recommendation: str
    base_charge: Optional[float] = None
    explanation: List[FeatureImpact] = []