from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    """
    Users table for authentication, authorization, and role management.
    Prepared for Phase 5 (JWT Auth) and Phase 6 (Underwriter Dashboard).
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="CUSTOMER", nullable=False)  # CUSTOMER, UNDERWRITER, ADMIN
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")


class Application(Base):
    """
    Insurance Application submitted by an applicant or underwriter.
    Persists risk parameters, status, and related records.
    """
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Core Underwriting Features
    age = Column(Integer, nullable=False)
    sex = Column(Integer, nullable=False)  # 1 = male, 0 = female
    bmi = Column(Float, nullable=False)
    children = Column(Integer, default=0, nullable=False)
    smoker = Column(Integer, nullable=False)  # 1 = yes, 0 = no
    region = Column(String(50), nullable=False)  # "northeast", "northwest", "southeast", "southwest"

    # Application Status
    status = Column(String(50), default="PENDING_REVIEW", nullable=False)  # PENDING_REVIEW, APPROVED, REJECTED, REFERRED

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="applications")
    predictions = relationship("Prediction", back_populates="application", cascade="all, delete-orphan", order_by="desc(Prediction.created_at)")
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan", order_by="desc(Document.uploaded_at)")
    decisions = relationship("UnderwriterDecision", back_populates="application", cascade="all, delete-orphan", order_by="desc(UnderwriterDecision.id)")


class Prediction(Base):
    """
    Persists ML model outputs, risk tiering, population baselines,
    model versioning, and JSON-encoded SHAP local explanations.
    """
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=True, index=True)

    # Prediction Outputs
    predicted_charge = Column(Float, nullable=False)
    risk_level = Column(String(50), nullable=False)  # Low, Medium, High
    recommendation = Column(String(255), nullable=False)
    base_charge = Column(Float, nullable=True)  # Baseline population average from TreeSHAP
    model_version = Column(String(50), default="2.0", nullable=False)

    # Explainability Data (JSON serialized feature attributions)
    explanation_json = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    application = relationship("Application", back_populates="predictions")


class Document(Base):
    """
    Persists metadata for uploaded customer underwriting documents.
    Status defaults to UPLOADED_PENDING_REVIEW per guidelines.
    """
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)

    document_type = Column(String(100), nullable=False)  # e.g., Aadhaar, PAN, Medical, Income
    filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)
    storage_path = Column(String(500), nullable=True)
    mime_type = Column(String(100), nullable=True)
    status = Column(String(50), default="UPLOADED_PENDING_REVIEW", nullable=False)

    # Document Intelligence & OCR outputs
    extracted_text = Column(Text, nullable=True)
    extraction_method = Column(String(50), nullable=True)  # EMBEDDED_PDF_TEXT, TESSERACT_OCR_*, etc.
    structured_data_json = Column(Text, nullable=True)
    consistency_checks_json = Column(Text, nullable=True)
    discrepancy_count = Column(Integer, default=0, nullable=False)

    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    application = relationship("Application", back_populates="documents")


class UnderwriterDecision(Base):
    """
    Records formal human underwriter decisions, notes, and overrides.
    """
    __tablename__ = "underwriter_decisions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)

    decision = Column(String(50), nullable=False)  # APPROVE, REJECT, REQUEST_MORE_INFO
    notes = Column(Text, nullable=True)
    underwriter_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    application = relationship("Application", back_populates="decisions")
    underwriter = relationship("User", foreign_keys=[underwriter_id])
