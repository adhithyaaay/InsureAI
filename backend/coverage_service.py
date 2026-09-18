"""
Coverage Recommendation Engine - Phase 10 Prototype
Deterministic coverage options and decision-support recommendations.

Evaluates applicant parameters, persisted XGBoost v2.0 predictions, and Underwriting Intelligence
to determine available coverage tiers and indicative premiums with zero automated policy binding.
"""

import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from policy_products import (
    PRODUCT_CATALOG,
    PRICING_DISCLAIMER,
    HUMAN_IN_THE_LOOP_DISCLAIMER,
    get_product_by_code,
)
from underwriting_summary import build_underwriting_summary

logger = logging.getLogger("insureai.coverage_service")


def generate_coverage_recommendation(
    application: Any,
    prediction: Any,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Deterministically computes prototype coverage options and indicative pricing
    based on the applicant profile and existing XGBoost v2.0 prediction.

    Strictly non-mutating: does NOT alter application status or persist decisions.
    """
    app_id = getattr(application, "id", None)
    base_predicted_premium = float(round(getattr(prediction, "predicted_charge", 0.0), 2))

    # Pull documents from application
    docs = getattr(application, "documents", []) or []

    # Generate or reuse underwriting intelligence summary
    summary_data = build_underwriting_summary(
        application=application,
        prediction=prediction,
        documents=docs,
    )

    risk_tier = summary_data.get("risk_level", "Unknown").upper()
    review_priority = summary_data.get("review_priority", "LOW").upper()
    doc_findings = summary_data.get("document_findings", {})
    has_critical_discrepancy = doc_findings.get("has_critical_discrepancy", False) if isinstance(doc_findings, dict) else getattr(doc_findings, "has_critical_discrepancy", False)

    # Calculate coverage options from product catalog
    coverage_options: List[Dict[str, Any]] = []
    for prod in PRODUCT_CATALOG:
        multiplier = prod["multiplier"]
        indicative_prem = float(round(base_predicted_premium * multiplier, 2))
        pct_display = int(multiplier * 100)
        
        option_item = {
            "product_code": prod["product_code"],
            "product_name": prod["product_name"],
            "coverage_amount": float(prod["coverage_amount"]),
            "coverage_display": prod["coverage_display"],
            "policy_period_years": int(prod["policy_period_years"]),
            "base_predicted_premium": base_predicted_premium,
            "indicative_premium": indicative_prem,
            "pricing_note": (
                f"Indicative prototype premium based on {pct_display}% base XGBoost v2.0 benchmark "
                f"({prod['coverage_display']} sum insured, {prod['policy_period_years']} year term)."
            ),
        }
        coverage_options.append(option_item)

    # Deterministic Recommendation Logic
    suggested_code = "STANDARD_10L"
    suggested_name = "Standard Health Plan"

    if review_priority == "CRITICAL" or has_critical_discrepancy:
        recommendation_reason = (
            "Coverage recommendation requires underwriter review due to critical review indicators."
        )
    elif risk_tier == "HIGH" or review_priority == "HIGH":
        recommendation_reason = (
            "High-risk application: All coverage options presented for review. Standard plan is suggested "
            "as a baseline, but senior underwriter evaluation is required."
        )
    else:
        recommendation_reason = (
            "Based on the model risk assessment and applicant characteristics, the Standard 10L plan is "
            "suggested for underwriter review."
        )

    # Look up product name for suggested code
    s_prod = get_product_by_code(suggested_code)
    suggested_name = s_prod.get("product_name", suggested_name)

    return {
        "application_id": app_id,
        "base_predicted_premium": base_predicted_premium,
        "currency": "INR",
        "coverage_options": coverage_options,
        "suggested_product_code": suggested_code,
        "suggested_product_name": suggested_name,
        "recommendation_reason": recommendation_reason,
        "review_priority": review_priority,
        "risk_tier": risk_tier,
        "human_in_the_loop_disclaimer": HUMAN_IN_THE_LOOP_DISCLAIMER,
        "pricing_disclaimer": PRICING_DISCLAIMER,
    }
