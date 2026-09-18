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
    category: str
    title: str
    message: str
    source: str = "application"
    requires_review: bool


class ShapFactorDetail(BaseModel):
    feature: str
    value: Any
    impact: float
    direction: Literal["increase", "decrease"]
    description: Optional[str] = None


class ShapSummaryResponse(BaseModel):
    base_charge: Optional[float] = None
    top_positive_factors: List[ShapFactorDetail] = []
    top_negative_factors: List[ShapFactorDetail] = []
    all_factors: List[Dict[str, Any]] = []


class DocumentFindingSummary(BaseModel):
    total_documents: int = 0
    processed_documents: int = 0
    discrepancy_count: int = 0
    verified_fields_count: int = 0
    has_critical_discrepancy: bool = False
    findings: List[str] = []


class UnderwritingSummaryResponse(BaseModel):
    application_id: int
    applicant: Optional[Dict[str, Any]] = None
    model_version: str = "2.0"
    base_charge: Optional[float] = None
    predicted_charge: Optional[float] = None
    risk_level: str = "Unknown"
    recommendation: str = "Pending Evaluation"
    shap_summary: Optional[ShapSummaryResponse] = None
    risk_indicators: List[UnderwritingRiskIndicator] = []
    document_findings: DocumentFindingSummary
    review_priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    review_priority_reasons: List[str] = []
    requires_human_review: bool = True
    summary_narrative: str
    summary: str
    human_in_the_loop_disclaimer: str = (
        "AI-generated intelligence is decision support only. Final underwriting decisions must be made by the authorized underwriter."
    )
    generated_at: str

    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# ANALYTICS & HEALTH SCHEMAS (Phase 9)
# ==============================================================================
class HealthResponse(BaseModel):
    status: str = "ok"
    database: Optional[str] = None


class AnalyticsDashboardResponse(BaseModel):
    total_applications: int
    pending_applications: int
    approved_applications: int
    rejected_applications: int
    review_required_applications: int
    approval_rate: float
    average_predicted_premium: float
    critical_priority_applications: int


class RiskDistributionResponse(BaseModel):
    low: int
    medium: int
    high: int


class MonthlyApplicationItem(BaseModel):
    month: str
    applications: int


class PremiumTrendItem(BaseModel):
    month: str
    average_premium: float


# ==============================================================================
# COVERAGE & POLICY RECOMMENDATION SCHEMAS (Phase 10)
# ==============================================================================
class CoverageOption(BaseModel):
    product_code: str
    product_name: str
    coverage_amount: float
    coverage_display: str
    policy_period_years: int
    base_predicted_premium: float
    indicative_premium: float
    pricing_note: str

    model_config = ConfigDict(from_attributes=True)


class CoverageRecommendationResponse(BaseModel):
    application_id: Optional[int] = None
    base_predicted_premium: float
    currency: str = "INR"
    coverage_options: List[CoverageOption]
    suggested_product_code: Optional[str] = None
    suggested_product_name: Optional[str] = None
    recommendation_reason: str
    review_priority: str
    risk_tier: str
    human_in_the_loop_disclaimer: str
    pricing_disclaimer: str

    model_config = ConfigDict(from_attributes=True)