import logging
from collections import defaultdict
from typing import Any, Dict, List
from sqlalchemy.orm import Session

import db_models
from underwriting_rules import evaluate_all_underwriting_indicators
from underwriting_summary import calculate_review_priority

logger = logging.getLogger("insureai.analytics")


def get_analytics_dashboard(db: Session) -> Dict[str, Any]:
    """
    Computes underwriting operations KPIs backed strictly by real database records.
    Never fabricates metrics.
    """
    applications = db.query(db_models.Application).all()
    total_applications = len(applications)

    pending_applications = 0
    approved_applications = 0
    rejected_applications = 0
    review_required_applications = 0
    critical_priority_applications = 0

    for app in applications:
        status = (app.status or "").upper().strip()
        if status == "PENDING_REVIEW":
            pending_applications += 1
        elif status == "APPROVED":
            approved_applications += 1
        elif status == "REJECTED":
            rejected_applications += 1
        elif status in ["REVIEW_REQUIRED", "REFERRED", "REQUEST_MORE_INFO"]:
            review_required_applications += 1

        # Calculate review priority using Phase 8 rules
        latest_pred = app.predictions[0] if app.predictions else None
        docs = app.documents or []
        indicators = evaluate_all_underwriting_indicators(
            application=app,
            documents=docs,
            prediction=latest_pred,
        )
        priority = calculate_review_priority(indicators, latest_pred.risk_level if latest_pred else None)
        if priority == "CRITICAL":
            critical_priority_applications += 1

    decided = approved_applications + rejected_applications
    approval_rate = round((approved_applications / decided) * 100.0, 1) if decided > 0 else 0.0

    # Predictions query for average predicted premium
    predictions = db.query(db_models.Prediction).all()
    if predictions:
        avg_premium = round(sum(p.predicted_charge for p in predictions) / len(predictions), 2)
    else:
        avg_premium = 0.0

    return {
        "total_applications": total_applications,
        "pending_applications": pending_applications,
        "approved_applications": approved_applications,
        "rejected_applications": rejected_applications,
        "review_required_applications": review_required_applications,
        "approval_rate": approval_rate,
        "average_predicted_premium": avg_premium,
        "critical_priority_applications": critical_priority_applications,
    }


def get_risk_distribution(db: Session) -> Dict[str, int]:
    """
    Aggregates application predictions across risk tiers (Low, Medium, High).
    """
    predictions = db.query(db_models.Prediction).all()
    distribution = {"low": 0, "medium": 0, "high": 0}

    for pred in predictions:
        tier = (pred.risk_level or "").lower().strip()
        if tier in distribution:
            distribution[tier] += 1
        elif "low" in tier:
            distribution["low"] += 1
        elif "high" in tier:
            distribution["high"] += 1
        elif "med" in tier:
            distribution["medium"] += 1
        else:
            distribution["medium"] += 1

    return distribution


def get_monthly_applications(db: Session) -> List[Dict[str, Any]]:
    """
    Aggregates application volumes by calendar month (YYYY-MM).
    Database-agnostic (works identically on SQLite and PostgreSQL).
    """
    applications = (
        db.query(db_models.Application)
        .order_by(db_models.Application.created_at.asc())
        .all()
    )

    monthly_counts: Dict[str, int] = defaultdict(int)
    for app in applications:
        if app.created_at:
            month_str = app.created_at.strftime("%Y-%m")
            monthly_counts[month_str] += 1

    return [
        {"month": m, "applications": count}
        for m, count in sorted(monthly_counts.items())
    ]


def get_premium_trends(db: Session) -> List[Dict[str, Any]]:
    """
    Aggregates average predicted insurance premiums by calendar month (YYYY-MM).
    Database-agnostic (works identically on SQLite and PostgreSQL).
    """
    predictions = (
        db.query(db_models.Prediction)
        .order_by(db_models.Prediction.created_at.asc())
        .all()
    )

    monthly_premiums: Dict[str, List[float]] = defaultdict(list)
    for pred in predictions:
        if pred.created_at and pred.predicted_charge is not None:
            month_str = pred.created_at.strftime("%Y-%m")
            monthly_premiums[month_str].append(float(pred.predicted_charge))

    return [
        {
            "month": m,
            "average_premium": round(sum(charges) / len(charges), 2),
        }
        for m, charges in sorted(monthly_premiums.items())
    ]
