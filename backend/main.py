import json
import logging
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import init_db, get_db
import db_models
from schemas import (
    Customer,
    FeatureImpact,
    PredictionResponse,
    ApplicationCreate,
    ApplicationResponse,
    DocumentMetadataCreate,
    DocumentMetadataResponse,
    UnderwriterDecisionCreate,
    UnderwriterDecisionResponse,
)
from predictor import predict_and_explain

logger = logging.getLogger("insureai.api")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    logger.info("Initializing InsureAI database tables...")
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as exc:
        logger.error(f"Failed to initialize database: {exc}")
    yield


app = FastAPI(
    title="InsureAI API",
    description="AI Underwriting & Insurance Charge Prediction API with Relational Persistence",
    version="2.0.0",
    lifespan=lifespan,
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def serialize_prediction(pred: db_models.Prediction) -> PredictionResponse:
    explanation: List[FeatureImpact] = []
    if pred.explanation_json:
        try:
            items = json.loads(pred.explanation_json)
            explanation = [FeatureImpact(**item) for item in items]
        except Exception as exc:
            logger.warning(f"Could not deserialize explanation JSON: {exc}")

    return PredictionResponse(
        id=pred.id,
        application_id=pred.application_id,
        model_version=pred.model_version,
        predicted_charge=pred.predicted_charge,
        risk_level=pred.risk_level,
        recommendation=pred.recommendation,
        base_charge=pred.base_charge,
        explanation=explanation,
        created_at=pred.created_at.isoformat() if pred.created_at else None,
    )


def serialize_application(app_record: db_models.Application) -> ApplicationResponse:
    preds = [serialize_prediction(p) for p in (app_record.predictions or [])]
    docs = [
        DocumentMetadataResponse(
            id=d.id,
            application_id=d.application_id,
            document_type=d.document_type,
            filename=d.filename,
            file_size=d.file_size,
            status=d.status,
            uploaded_at=d.uploaded_at.isoformat() if d.uploaded_at else None,
        )
        for d in (app_record.documents or [])
    ]
    return ApplicationResponse(
        id=app_record.id,
        user_id=app_record.user_id,
        age=app_record.age,
        sex=app_record.sex,
        bmi=app_record.bmi,
        children=app_record.children,
        smoker=app_record.smoker,
        region=app_record.region,
        status=app_record.status,
        created_at=app_record.created_at.isoformat() if app_record.created_at else None,
        updated_at=app_record.updated_at.isoformat() if app_record.updated_at else None,
        predictions=preds,
        documents=docs,
    )


@app.get("/")
def home():
    return {
        "message": "Welcome to InsureAI API",
        "status": "online",
        "version": "2.0.0",
    }


# ==============================================================================
# ML PREDICTION ENDPOINT (Standalone / Backward-Compatible)
# ==============================================================================
@app.post("/predict", response_model=PredictionResponse)
def predict(customer: Customer):
    """
    Computes real-time ML prediction and SHAP explainability.
    Preserved for backward compatibility with Phase 1, 2, and 3 workflows.
    """
    prediction, explanation, base_charge = predict_and_explain(customer)

    if prediction < 8000:
        risk = "Low"
        recommendation = "Eligible for Standard Premium"
    elif prediction < 20000:
        risk = "Medium"
        recommendation = "Additional document verification recommended"
    else:
        risk = "High"
        recommendation = "Manual underwriting review required"

    return PredictionResponse(
        predicted_charge=prediction,
        risk_level=risk,
        recommendation=recommendation,
        base_charge=base_charge,
        explanation=explanation,
        model_version="2.0",
    )


# ==============================================================================
# APPLICATION ENDPOINTS (Phase 4 Database Persistence)
# ==============================================================================
@app.post("/applications", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
def create_application(app_in: ApplicationCreate, db: Session = Depends(get_db)):
    """
    Persists a new insurance underwriting application in the database.
    Initial status is set to PENDING_REVIEW.
    """
    application = db_models.Application(
        user_id=app_in.user_id,
        age=app_in.age,
        sex=app_in.sex,
        bmi=app_in.bmi,
        children=app_in.children,
        smoker=app_in.smoker,
        region=app_in.region,
        status="PENDING_REVIEW",
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return serialize_application(application)


@app.get("/applications", response_model=List[ApplicationResponse])
def list_applications(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Lists insurance applications sorted by creation date descending.
    """
    applications = (
        db.query(db_models.Application)
        .order_by(db_models.Application.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [serialize_application(a) for a in applications]


@app.get("/applications/{application_id}", response_model=ApplicationResponse)
def get_application(application_id: int, db: Session = Depends(get_db)):
    """
    Retrieves a single application by ID with linked predictions and documents.
    """
    application = db.query(db_models.Application).filter(db_models.Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application #{application_id} not found."
        )
    return serialize_application(application)


@app.post("/applications/{application_id}/predict", response_model=PredictionResponse)
def predict_and_persist_for_application(
    application_id: int,
    customer_override: Optional[Customer] = None,
    db: Session = Depends(get_db)
):
    """
    Generates ML prediction + TreeSHAP attributions and records the prediction
    in the database linked to the specified application.
    """
    application = db.query(db_models.Application).filter(db_models.Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application #{application_id} not found."
        )

    # Use provided customer override or use applicant attributes from database record
    if customer_override:
        customer = customer_override
    else:
        customer = Customer(
            age=application.age,
            sex=application.sex,
            bmi=application.bmi,
            children=application.children,
            smoker=application.smoker,
            region=application.region,
        )

    prediction_value, explanation, base_charge = predict_and_explain(customer)

    if prediction_value < 8000:
        risk = "Low"
        recommendation = "Eligible for Standard Premium"
    elif prediction_value < 20000:
        risk = "Medium"
        recommendation = "Additional document verification recommended"
    else:
        risk = "High"
        recommendation = "Manual underwriting review required"

    # Save to database
    explanation_json = json.dumps(
        [item.model_dump() if hasattr(item, "model_dump") else item for item in explanation]
    )
    pred_record = db_models.Prediction(
        application_id=application.id,
        predicted_charge=prediction_value,
        risk_level=risk,
        recommendation=recommendation,
        base_charge=base_charge,
        model_version="2.0",
        explanation_json=explanation_json,
    )
    db.add(pred_record)
    db.commit()
    db.refresh(pred_record)

    return serialize_prediction(pred_record)


@app.post(
    "/applications/{application_id}/documents",
    response_model=DocumentMetadataResponse,
    status_code=status.HTTP_201_CREATED
)
def add_document_metadata(
    application_id: int,
    doc_in: DocumentMetadataCreate,
    db: Session = Depends(get_db)
):
    """
    Saves uploaded document metadata with status UPLOADED_PENDING_REVIEW.
    """
    application = db.query(db_models.Application).filter(db_models.Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application #{application_id} not found."
        )

    document = db_models.Document(
        application_id=application.id,
        document_type=doc_in.document_type,
        filename=doc_in.filename,
        file_size=doc_in.file_size,
        status="UPLOADED_PENDING_REVIEW",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    return DocumentMetadataResponse(
        id=document.id,
        application_id=document.application_id,
        document_type=document.document_type,
        filename=document.filename,
        file_size=document.file_size,
        status=document.status,
        uploaded_at=document.uploaded_at.isoformat() if document.uploaded_at else None,
    )


@app.get("/applications/{application_id}/predictions", response_model=List[PredictionResponse])
def get_application_predictions(application_id: int, db: Session = Depends(get_db)):
    """
    Retrieves the prediction history for an application.
    """
    application = db.query(db_models.Application).filter(db_models.Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application #{application_id} not found."
        )

    preds = (
        db.query(db_models.Prediction)
        .filter(db_models.Prediction.application_id == application_id)
        .order_by(db_models.Prediction.created_at.desc())
        .all()
    )
    return [serialize_prediction(p) for p in preds]


@app.post(
    "/applications/{application_id}/decisions",
    response_model=UnderwriterDecisionResponse,
    status_code=status.HTTP_201_CREATED
)
def record_underwriter_decision(
    application_id: int,
    decision_in: UnderwriterDecisionCreate,
    db: Session = Depends(get_db)
):
    """
    Records an underwriter decision and updates application status.
    """
    application = db.query(db_models.Application).filter(db_models.Application.id == application_id).first()
    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application #{application_id} not found."
        )

    decision_record = db_models.UnderwriterDecision(
        application_id=application.id,
        decision=decision_in.decision,
        notes=decision_in.notes,
        underwriter_id=decision_in.underwriter_id,
    )
    db.add(decision_record)

    # Sync status
    if decision_in.decision.upper() in ["APPROVE", "APPROVED"]:
        application.status = "APPROVED"
    elif decision_in.decision.upper() in ["REJECT", "REJECTED"]:
        application.status = "REJECTED"
    elif decision_in.decision.upper() in ["REQUEST_INFO", "REFERRED"]:
        application.status = "REFERRED"

    db.commit()
    db.refresh(decision_record)

    return UnderwriterDecisionResponse(
        id=decision_record.id,
        application_id=decision_record.application_id,
        decision=decision_record.decision,
        notes=decision_record.notes,
        underwriter_id=decision_record.underwriter_id,
        created_at=decision_record.created_at.isoformat() if decision_record.created_at else None,
    )