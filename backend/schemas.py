from typing import Any, Dict, List, Literal, Optional, Union
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


class ConsistencyCheckItem(BaseModel):
    field: str
    label: str
    application_value: Any
    document_value: Any
    status: str  # MATCH, MISMATCH, NOT_FOUND
    details: str


class DocumentMetadataResponse(BaseModel):
    id: int
    application_id: int
    document_type: str
    filename: str
    file_size: Optional[int] = None
    storage_path: Optional[str] = None
    mime_type: Optional[str] = None
    status: str = "UPLOADED_PENDING_REVIEW"
    extraction_method: Optional[str] = None
    extracted_text: Optional[str] = None
    structured_data: Optional[Dict[str, Any]] = None
    consistency_checks: List[ConsistencyCheckItem] = []
    discrepancy_count: int = 0
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
    underwriter_name: Optional[str] = None
    created_at: Any

    model_config = ConfigDict(from_attributes=True)


class ApplicationResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    applicant_name: Optional[str] = None
    applicant_email: Optional[str] = None
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
    decisions: List[UnderwriterDecisionResponse] = []
    review_priority: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# UNDERWRITING INTELLIGENCE & DECISION SUPPORT SCHEMAS (Phase 8)
# ==============================================================================
class UnderwritingRiskIndicator(BaseModel):
    code: str
    severity: Literal["info", "attention", "warning", "critical"]
    title: str
    message: str
    source: str
    requires_review: bool


class ShapFactorDetail(BaseModel):
    feature: str
    value: Any
    impact: float
    direction: Literal["increase", "decrease"]
    description: str


class ShapSummaryResponse(BaseModel):
    top_positive_factors: List[ShapFactorDetail] = []
    top_negative_factors: List[ShapFactorDetail] = []
    all_factors: List[Dict[str, Any]] = []


class DocumentFindingSummary(BaseModel):
    id: Optional[int] = None
    document_type: str
    filename: str
    status: str
    extraction_method: Optional[str] = None
    discrepancy_count: int = 0


class UnderwritingSummaryResponse(BaseModel):
    application_id: int
    applicant: Optional[Dict[str, Any]] = None
    model_version: str = "2.0"
    base_charge: Optional[float] = None
    predicted_charge: Optional[float] = None
    risk_level: str = "Unknown"
    recommendation: str = "Pending Evaluation"
    shap_summary: ShapSummaryResponse
    risk_indicators: List[UnderwritingRiskIndicator] = []
    document_findings: List[DocumentFindingSummary] = []
    review_priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    requires_human_review: bool
    summary: str
    human_in_the_loop_disclaimer: str

    model_config = ConfigDict(from_attributes=True)