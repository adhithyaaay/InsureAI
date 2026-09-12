import json
import logging
from typing import Dict, Any, List, Optional
from underwriting_rules import evaluate_all_underwriting_indicators

logger = logging.getLogger("insureai.underwriting_summary")


def calculate_review_priority(
    indicators: List[Dict[str, Any]],
    risk_level: Optional[str] = None
) -> str:
    """
    Calculates deterministic review priority for the human underwriter.
    Possible return values: CRITICAL, HIGH, MEDIUM, LOW.

    This represents review queue urgency and inspection depth,
    NEVER an automated approval or rejection decision.
    """
    critical_count = sum(1 for i in indicators if i.get("severity") == "critical")
    warning_count = sum(1 for i in indicators if i.get("severity") == "warning")
    attention_count = sum(1 for i in indicators if i.get("severity") == "attention")
    norm_risk = (risk_level or "").upper()

    # 1. CRITICAL Priority
    if critical_count > 0 or warning_count >= 3:
        return "CRITICAL"

    # 2. HIGH Priority
    if (
        warning_count >= 1 and attention_count >= 1
        or warning_count >= 2
        or any(i.get("code") == "DOCUMENT_DISCREPANCY" for i in indicators)
        or norm_risk == "HIGH"
        or (attention_count >= 2 and norm_risk in ("MEDIUM", "HIGH"))
    ):
        return "HIGH"

    # 3. MEDIUM Priority
    if (
        warning_count >= 1
        or attention_count >= 1
        or norm_risk == "MEDIUM"
        or any(i.get("requires_review") for i in indicators)
    ):
        return "MEDIUM"

    # 4. LOW Priority
    return "LOW"


def parse_shap_explanation(prediction: Optional[Any]) -> Dict[str, Any]:
    """
    Splits SHAP local attributions into positive (cost increasing)
    and negative (cost decreasing) factors, preserving actual values.
    """
    if not prediction or not getattr(prediction, "explanation_json", None):
        return {
            "top_positive_factors": [],
            "top_negative_factors": [],
            "all_factors": [],
        }

    try:
        raw_items = json.loads(prediction.explanation_json)
    except Exception as exc:
        logger.warning(f"Failed to parse explanation_json: {exc}")
        return {
            "top_positive_factors": [],
            "top_negative_factors": [],
            "all_factors": [],
        }

    positives = []
    negatives = []

    for item in raw_items:
        formatted = {
            "feature": item.get("feature", "Unknown"),
            "value": item.get("value", ""),
            "impact": float(item.get("impact", 0.0)),
            "direction": item.get("direction", "increase"),
            "description": (
                f"+ ₹ {float(item.get('impact', 0.0)):,.2f} (increases premium)"
                if item.get("direction") == "increase"
                else f"- ₹ {float(item.get('impact', 0.0)):,.2f} (reduces premium)"
            ),
        }
        if item.get("direction") == "increase":
            positives.append(formatted)
        else:
            negatives.append(formatted)

    positives.sort(key=lambda x: x["impact"], reverse=True)
    negatives.sort(key=lambda x: x["impact"], reverse=True)

    return {
        "top_positive_factors": positives,
        "top_negative_factors": negatives,
        "all_factors": raw_items,
    }


def synthesize_deterministic_narrative(
    application: Any,
    prediction: Optional[Any],
    shap_summary: Dict[str, Any],
    indicators: List[Dict[str, Any]],
    review_priority: str
) -> str:
    """
    Synthesizes a clear, deterministic underwriter decision-support narrative
    solely from verified application, ML, SHAP, and document data.
    """
    sentences = []

    # 1. Premium & Prediction context
    if prediction:
        charge = getattr(prediction, "predicted_charge", 0.0)
        base = getattr(prediction, "base_charge", 13346.09) or 13346.09
        sentences.append(
            f"Model v{getattr(prediction, 'model_version', '2.0')} estimated an annual premium of ₹{charge:,.2f} "
            f"(population baseline: ₹{base:,.2f})."
        )
    else:
        sentences.append("Application submitted; ML premium assessment has not been generated.")

    # 2. Key SHAP drivers
    positives = shap_summary.get("top_positive_factors", [])
    negatives = shap_summary.get("top_negative_factors", [])

    if positives:
        top_pos_names = [f"{p['feature']} (+₹{p['impact']:,.0f})" for p in positives[:3]]
        sentences.append(f"The primary factors driving the premium upward are {', '.join(top_pos_names)}.")

    if negatives:
        top_neg_names = [f"{n['feature']} (-₹{n['impact']:,.0f})" for n in negatives[:2]]
        sentences.append(f"Cost reductions were provided by {', '.join(top_neg_names)}.")

    # 3. Document findings & discrepancies
    critical_indicators = [i for i in indicators if i.get("severity") == "critical"]
    warning_indicators = [i for i in indicators if i.get("severity") == "warning"]

    if critical_indicators:
        sentences.append(
            f"CRITICAL REVIEW REQUIRED: {critical_indicators[0]['title']} — {critical_indicators[0]['message']}."
        )
    elif warning_indicators:
        warning_titles = [w['title'] for w in warning_indicators[:2]]
        sentences.append(f"Underwriting attention warranted for {', '.join(warning_titles)}.")
    elif any(i.get("code") == "DOCUMENTS_CONSISTENT" for i in indicators):
        sentences.append("All submitted documents have been verified as consistent with applicant declarations.")

    # 4. Final human-in-the-loop priority guidance
    sentences.append(
        f"Case review priority is assessed as {review_priority}. Final policy determination remains with the human underwriter."
    )

    return " ".join(sentences)


def build_underwriting_summary(
    application: Any,
    prediction: Optional[Any],
    documents: List[Any],
) -> Dict[str, Any]:
    """
    Assembles the complete explainable Underwriting Intelligence & Decision Support package.
    Calculated dynamically on demand.
    """
    # 1. Evaluate deterministic indicators
    indicators = evaluate_all_underwriting_indicators(
        application=application,
        documents=documents,
        prediction=prediction,
    )

    # 2. Determine review priority
    risk_level = getattr(prediction, "risk_level", None)
    review_priority = calculate_review_priority(indicators, risk_level)

    # 3. Parse and structure SHAP feature attributions
    shap_summary = parse_shap_explanation(prediction)

    # 4. Synthesize human-readable narrative
    narrative = synthesize_deterministic_narrative(
        application=application,
        prediction=prediction,
        shap_summary=shap_summary,
        indicators=indicators,
        review_priority=review_priority,
    )

    # 5. Extract document findings recap
    doc_findings = []
    for d in documents:
        doc_findings.append({
            "id": getattr(d, "id", None),
            "document_type": getattr(d, "document_type", "Unknown"),
            "filename": getattr(d, "filename", ""),
            "status": getattr(d, "status", ""),
            "extraction_method": getattr(d, "extraction_method", None),
            "discrepancy_count": getattr(d, "discrepancy_count", 0),
        })

    # 6. Assemble complete response package
    applicant_data = None
    if hasattr(application, "user") and application.user:
        applicant_data = {
            "id": application.user.id,
            "name": application.user.name,
            "email": application.user.email,
        }

    return {
        "application_id": getattr(application, "id", None),
        "applicant": applicant_data,
        "model_version": getattr(prediction, "model_version", "2.0") if prediction else "2.0",
        "base_charge": getattr(prediction, "base_charge", 13346.09) if prediction else None,
        "predicted_charge": getattr(prediction, "predicted_charge", None) if prediction else None,
        "risk_level": getattr(prediction, "risk_level", "Unknown") if prediction else "Unknown",
        "recommendation": getattr(prediction, "recommendation", "Pending Evaluation") if prediction else "Pending Evaluation",
        "shap_summary": shap_summary,
        "risk_indicators": indicators,
        "document_findings": doc_findings,
        "review_priority": review_priority,
        "requires_human_review": any(i.get("requires_review") for i in indicators) or review_priority in ("HIGH", "CRITICAL"),
        "summary": narrative,
        "human_in_the_loop_disclaimer": "AI-generated intelligence is decision support only. Final underwriting decisions must be made by the authorized underwriter.",
    }
