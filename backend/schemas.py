from typing import Any, List, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, EmailStr


# ==============================================================================
# AUTHENTICATION & USER SCHEMAS
# ==============================================================================
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: Any

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ==============================================================================
# ML PREDICTION SCHEMAS
# ==============================================================================
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
    id: Optional[int] = None
    application_id: Optional[int] = None
    model_version: Optional[str] = "2.0"
    predicted_charge: float
    risk_level: str
    recommendation: str
    base_charge: Optional[float] = None
    explanation: List[FeatureImpact] = []
    created_at: Optional[Any] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# DOCUMENT & APPLICATION SCHEMAS
# ==============================================================================
class DocumentMetadataCreate(BaseModel):
    document_type: str
    filename: str
    file_size: Optional[int] = None


class DocumentMetadataResponse(BaseModel):
    id: int
    application_id: int
    document_type: str
    filename: str
    file_size: Optional[int] = None
    status: str = "UPLOADED_PENDING_REVIEW"
    uploaded_at: Any

    model_config = ConfigDict(from_attributes=True)


class ApplicationCreate(BaseModel):
    age: int
    sex: int
    bmi: float
    children: int = 0
    smoker: int
    region: str
    user_id: Optional[int] = None


class ApplicationResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    age: int
    sex: int
    bmi: float
    children: int
    smoker: int
    region: str
    status: str = "PENDING_REVIEW"
    created_at: Any
    updated_at: Any
    predictions: List[PredictionResponse] = []
    documents: List[DocumentMetadataResponse] = []

    model_config = ConfigDict(from_attributes=True)


class UnderwriterDecisionCreate(BaseModel):
    decision: str
    notes: Optional[str] = None
    underwriter_id: Optional[int] = None


class UnderwriterDecisionResponse(BaseModel):
    id: int
    application_id: int
    decision: str
    notes: Optional[str] = None
    underwriter_id: Optional[int] = None
    created_at: Any

    model_config = ConfigDict(from_attributes=True)