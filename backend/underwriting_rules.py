import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("insureai.underwriting_rules")


def parse_document_checks(doc: Any) -> List[Dict[str, Any]]:
    """Safely extracts consistency checks list from a Document model."""
    if not hasattr(doc, "consistency_checks_json") or not doc.consistency_checks_json:
        return []
    try:
        return json.loads(doc.consistency_checks_json)
    except Exception as exc:
        logger.warning(f"Could not parse consistency checks for document #{getattr(doc, 'id', '?')}: {exc}")
        return []


def evaluate_smoking_indicators(application: Any, documents: List[Any]) -> List[Dict[str, Any]]:
    """Evaluates smoking-related underwriting review indicators."""
    indicators = []

    # 1. Check for smoking disclosure discrepancy first (critical)
    smoking_mismatch_found = False
    mismatch_details = ""
    for doc in documents:
        checks = parse_document_checks(doc)
        for chk in checks:
            if chk.get("field") == "smoking_disclosure" and chk.get("status") == "MISMATCH":
                smoking_mismatch_found = True
                mismatch_details = chk.get("details", "")
                break
        if smoking_mismatch_found:
            break

    if smoking_mismatch_found:
        indicators.append({
            "code": "CRITICAL_DOCUMENT_DISCREPANCY",
            "severity": "critical",
            "title": "Smoking Disclosure Discrepancy",
            "message": mismatch_details or "The medical document indicates smoking/tobacco use while the application declares non-smoking.",
            "source": "medical_document",
            "requires_review": True,
        })
    elif getattr(application, "smoker", 0) == 1:
        indicators.append({
            "code": "SMOKING_DISCLOSED",
            "severity": "attention",
            "title": "Disclosed Smoking Status",
            "message": "Applicant disclosed active smoking status (smoker = 1), which significantly increases morbidity risk and predicted premium.",
            "source": "application_disclosure",
            "requires_review": True,
        })

    return indicators


def evaluate_bmi_indicators(application: Any) -> List[Dict[str, Any]]:
    """Evaluates BMI-related underwriting review indicators."""
    bmi = getattr(application, "bmi", None)
    if bmi is None:
        return []

    if bmi < 18.5:
        return [{
            "code": "BMI_BELOW_NORMAL",
            "severity": "info",
            "title": "BMI Below Standard Range",
            "message": f"Applicant BMI ({bmi:.1f}) is below standard normal range (<18.5).",
            "source": "application_disclosure",
            "requires_review": False,
        }]
    elif 18.5 <= bmi <= 24.9:
        return [{
            "code": "BMI_NORMAL_RANGE",
            "severity": "info",
            "title": "BMI Normal Range",
            "message": f"Applicant BMI ({bmi:.1f}) is within standard healthy parameters (18.5–24.9).",
            "source": "application_disclosure",
            "requires_review": False,
        }]
    elif 25.0 <= bmi <= 29.9:
        return [{
            "code": "BMI_ABOVE_NORMAL",
            "severity": "attention",
            "title": "BMI Above Normal Range",
            "message": f"Applicant BMI ({bmi:.1f}) falls into the overweight category (25.0–29.9).",
            "source": "application_disclosure",
            "requires_review": False,
        }]
    else:  # >= 30.0
        return [{
            "code": "HIGH_BMI_REVIEW",
            "severity": "warning",
            "title": "High BMI Requiring Review",
            "message": f"Applicant BMI ({bmi:.1f}) is in the obese tier (>=30.0), significantly impacting calculated health charges.",
            "source": "application_disclosure",
            "requires_review": True,
        }]


def evaluate_age_indicators(application: Any) -> List[Dict[str, Any]]:
    """Evaluates age-related underwriting review indicators."""
    age = getattr(application, "age", None)
    if age is None:
        return []

    if 18 <= age <= 29:
        return [{
            "code": "YOUNGER_APPLICANT",
            "severity": "info",
            "title": "Younger Demographic Tier",
            "message": f"Applicant age ({age} yrs) is in the younger demographic tier (18–29).",
            "source": "application_disclosure",
            "requires_review": False,
        }]
    elif 30 <= age <= 49:
        return [{
            "code": "STANDARD_AGE_RANGE",
            "severity": "info",
            "title": "Standard Age Range",
            "message": f"Applicant age ({age} yrs) is in the standard underwriting age tier (30–49).",
            "source": "application_disclosure",
            "requires_review": False,
        }]
    else:  # >= 50
        return [{
            "code": "OLDER_APPLICANT_REVIEW",
            "severity": "attention",
            "title": "Older Demographic Review",
            "message": f"Applicant age ({age} yrs) is in the elevated age tier (50+), where baseline morbidity charges scale upward.",
            "source": "application_disclosure",
            "requires_review": True,
        }]


def evaluate_document_consistency_indicators(documents: List[Any]) -> List[Dict[str, Any]]:
    """Evaluates non-smoking document consistency indicators."""
    indicators = []
    if not documents:
        return indicators

    total_discrepancies = 0
    non_smoking_mismatches = []

    for doc in documents:
        checks = parse_document_checks(doc)
        for chk in checks:
            if chk.get("status") == "MISMATCH":
                total_discrepancies += 1
                if chk.get("field") != "smoking_disclosure":
                    non_smoking_mismatches.append(f"{chk.get('label', 'Field')}: {chk.get('details', 'Mismatch detected')}")

    if non_smoking_mismatches:
        indicators.append({
            "code": "DOCUMENT_DISCREPANCY",
            "severity": "warning",
            "title": "Document Verification Discrepancy",
            "message": "; ".join(non_smoking_mismatches),
            "source": "document_verification",
            "requires_review": True,
        })
    elif total_discrepancies == 0 and len(documents) > 0:
        indicators.append({
            "code": "DOCUMENTS_CONSISTENT",
            "severity": "info",
            "title": "Document Disclosures Consistent",
            "message": "All verified documents match applicant declarations without discrepancies.",
            "source": "document_verification",
            "requires_review": False,
        })

    return indicators


def evaluate_missing_info_indicators(
    application: Any,
    documents: List[Any],
    prediction: Optional[Any]
) -> List[Dict[str, Any]]:
    """Evaluates checklist completeness for underwriting dossiers."""
    indicators = []

    # 1. Check for medical examination report
    has_medical = any("medic" in str(getattr(d, "document_type", "")).lower() or "health" in str(getattr(d, "document_type", "")).lower() for d in documents)
    age = getattr(application, "age", 0)
    bmi = getattr(application, "bmi", 0.0)
    smoker = getattr(application, "smoker", 0)

    if not has_medical:
        # High risk factors elevate severity of missing medical report
        is_elevated_risk = age >= 45 or bmi >= 30.0 or smoker == 1
        indicators.append({
            "code": "MISSING_MEDICAL_REPORT",
            "severity": "warning" if is_elevated_risk else "attention",
            "title": "Missing Medical Report",
            "message": "No medical examination or health report has been submitted for this policy application.",
            "source": "document_checklist",
            "requires_review": is_elevated_risk,
        })

    # 2. Check for identity document (PAN or Aadhaar)
    has_identity = any(
        any(kw in str(getattr(d, "document_type", "")).lower() for kw in ["pan", "aadhaar", "adhaar", "ident", "passport"])
        for d in documents
    )
    if not has_identity:
        indicators.append({
            "code": "MISSING_IDENTITY_DOCUMENT",
            "severity": "warning",
            "title": "Missing Identity Document",
            "message": "Neither PAN Card nor Aadhaar Card has been uploaded to substantiate applicant identity.",
            "source": "document_checklist",
            "requires_review": True,
        })

    # 3. Check for ML prediction
    if not prediction:
        indicators.append({
            "code": "MISSING_ML_PREDICTION",
            "severity": "warning",
            "title": "ML Prediction Pending",
            "message": "Machine learning risk assessment has not yet been computed for this application.",
            "source": "ml_engine",
            "requires_review": True,
        })

    return indicators


def evaluate_all_underwriting_indicators(
    application: Any,
    documents: List[Any],
    prediction: Optional[Any]
) -> List[Dict[str, Any]]:
    """
    Executes the complete deterministic underwriting indicator pipeline.
    Returns a unified list of UnderwritingRiskIndicator objects.
    """
    indicators = []
    indicators.extend(evaluate_smoking_indicators(application, documents))
    indicators.extend(evaluate_bmi_indicators(application))
    indicators.extend(evaluate_age_indicators(application))
    indicators.extend(evaluate_document_consistency_indicators(documents))
    indicators.extend(evaluate_missing_info_indicators(application, documents, prediction))

    # Order indicators by severity: critical -> warning -> attention -> info
    severity_rank = {"critical": 0, "warning": 1, "attention": 2, "info": 3}
    indicators.sort(key=lambda x: severity_rank.get(x["severity"], 4))

    return indicators
