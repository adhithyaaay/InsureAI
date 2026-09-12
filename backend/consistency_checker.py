import re
from datetime import datetime
from typing import Dict, Any, List, Tuple, Optional
import logging

logger = logging.getLogger("insureai.consistency")


def parse_dob_to_age(dob_str: str) -> Optional[int]:
    """Calculates age in years from a DD/MM/YYYY or YYYY-MM-DD string."""
    if not dob_str:
        return None

    # Replace dashes with slashes
    clean_dob = dob_str.replace("-", "/")
    parts = clean_dob.split("/")
    current_year = datetime.now().year

    try:
        if len(parts) == 3:
            if len(parts[0]) == 4:  # YYYY/MM/DD
                birth_year = int(parts[0])
            else:  # DD/MM/YYYY
                birth_year = int(parts[2])
            return current_year - birth_year
    except Exception:
        pass
    return None


def clean_name_tokens(name: str) -> set:
    """Extracts lowercase tokens from a name string, ignoring common titles."""
    if not name:
        return set()
    cleaned = re.sub(r"[^a-zA-Z\s]", "", name.lower())
    ignore_tokens = {"mr", "mrs", "ms", "dr", "shri", "smt", "kumar", "kumari"}
    return {t for t in cleaned.split() if len(t) > 1 and t not in ignore_tokens}


def check_document_consistency(
    extracted_fields: Dict[str, Any],
    application: Any,
    applicant_name: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], int, str]:
    """
    Performs algorithmic consistency checks comparing extracted document data
    against applicant disclosures.

    Returns:
        (checks_list, discrepancy_count, summary_text)
    """
    checks: List[Dict[str, Any]] = []
    discrepancy_count = 0

    # -------------------------------------------------------------------------
    # 1. Applicant Name Check
    # -------------------------------------------------------------------------
    doc_name = extracted_fields.get("name") or extracted_fields.get("patient_name")
    app_name = applicant_name or (application.user.name if hasattr(application, "user") and application.user else None)

    if doc_name and app_name:
        doc_tokens = clean_name_tokens(doc_name)
        app_tokens = clean_name_tokens(app_name)
        overlap = doc_tokens.intersection(app_tokens)

        # Name matches if at least one meaningful token overlaps or names are identical
        if overlap or doc_name.strip().lower() in app_name.strip().lower() or app_name.strip().lower() in doc_name.strip().lower():
            checks.append({
                "field": "applicant_name",
                "label": "Applicant Name",
                "application_value": app_name,
                "document_value": doc_name,
                "status": "MATCH",
                "details": f"Extracted name '{doc_name}' matches application profile '{app_name}'."
            })
        else:
            discrepancy_count += 1
            checks.append({
                "field": "applicant_name",
                "label": "Applicant Name",
                "application_value": app_name,
                "document_value": doc_name,
                "status": "MISMATCH",
                "details": f"Name mismatch: document lists '{doc_name}' while application profile is '{app_name}'."
            })
    elif doc_name:
        checks.append({
            "field": "applicant_name",
            "label": "Applicant Name",
            "application_value": app_name or "Not Available",
            "document_value": doc_name,
            "status": "MATCH",
            "details": f"Extracted name: '{doc_name}'."
        })
    else:
        checks.append({
            "field": "applicant_name",
            "label": "Applicant Name",
            "application_value": app_name or "Not Available",
            "document_value": "Not detected",
            "status": "NOT_FOUND",
            "details": "Name could not be reliably extracted from this document."
        })

    # -------------------------------------------------------------------------
    # 2. Age / Date of Birth Check
    # -------------------------------------------------------------------------
    dob_str = extracted_fields.get("dob")
    yob = extracted_fields.get("year_of_birth")
    app_age = getattr(application, "age", None)

    calculated_age = None
    if dob_str:
        calculated_age = parse_dob_to_age(dob_str)
    elif yob:
        calculated_age = datetime.now().year - yob

    if calculated_age is not None and app_age is not None:
        # Allow +/- 1 year tolerance for birthday cutoff timing
        if abs(calculated_age - app_age) <= 1:
            checks.append({
                "field": "age_dob",
                "label": "Age & Date of Birth",
                "application_value": f"{app_age} years",
                "document_value": f"{dob_str or f'YOB: {yob}'} (~{calculated_age} yrs)",
                "status": "MATCH",
                "details": f"Calculated age ({calculated_age} yrs) from document matches application age ({app_age} yrs)."
            })
        else:
            discrepancy_count += 1
            checks.append({
                "field": "age_dob",
                "label": "Age & Date of Birth",
                "application_value": f"{app_age} years",
                "document_value": f"{dob_str or f'YOB: {yob}'} (~{calculated_age} yrs)",
                "status": "MISMATCH",
                "details": f"Age discrepancy: document implies age {calculated_age}, but application states {app_age} years."
            })
    else:
        checks.append({
            "field": "age_dob",
            "label": "Age & Date of Birth",
            "application_value": f"{app_age} years" if app_age is not None else "N/A",
            "document_value": "Not detected",
            "status": "NOT_FOUND",
            "details": "Date of birth was not identified in this document."
        })

    # -------------------------------------------------------------------------
    # 3. Gender Check
    # -------------------------------------------------------------------------
    doc_gender = extracted_fields.get("gender")
    app_sex = getattr(application, "sex", None)
    app_gender_label = "Male" if app_sex == 1 else "Female" if app_sex == 0 else "N/A"

    if doc_gender and app_sex is not None:
        doc_is_male = doc_gender.upper() == "MALE"
        app_is_male = (app_sex == 1)

        if doc_is_male == app_is_male:
            checks.append({
                "field": "gender",
                "label": "Gender",
                "application_value": app_gender_label,
                "document_value": doc_gender.capitalize(),
                "status": "MATCH",
                "details": f"Document gender '{doc_gender.capitalize()}' matches application disclosure."
            })
        else:
            discrepancy_count += 1
            checks.append({
                "field": "gender",
                "label": "Gender",
                "application_value": app_gender_label,
                "document_value": doc_gender.capitalize(),
                "status": "MISMATCH",
                "details": f"Gender mismatch: document specifies '{doc_gender.capitalize()}' but application states '{app_gender_label}'."
            })

    # -------------------------------------------------------------------------
    # 4. Smoking Disclosure Check (Primarily for Medical Reports)
    # -------------------------------------------------------------------------
    doc_smoking = extracted_fields.get("smoking_status")
    app_smoker = getattr(application, "smoker", None)
    app_smoker_label = "Smoker" if app_smoker == 1 else "Non-smoker" if app_smoker == 0 else "N/A"

    if doc_smoking:
        if app_smoker == 0 and doc_smoking == "SMOKER":
            discrepancy_count += 1
            checks.append({
                "field": "smoking_disclosure",
                "label": "Smoking Status",
                "application_value": "Non-smoker (0)",
                "document_value": "Active Smoker / Tobacco Positive",
                "status": "MISMATCH",
                "details": "CRITICAL DISCREPANCY: Applicant declared non-smoker, but medical report documents active smoking or tobacco use."
            })
        elif app_smoker == 1 and doc_smoking == "NON_SMOKER":
            discrepancy_count += 1
            checks.append({
                "field": "smoking_disclosure",
                "label": "Smoking Status",
                "application_value": "Smoker (1)",
                "document_value": "Non-smoker / Tobacco Negative",
                "status": "MISMATCH",
                "details": "Discrepancy: Applicant declared smoker, but medical record records non-smoker."
            })
        else:
            checks.append({
                "field": "smoking_disclosure",
                "label": "Smoking Status",
                "application_value": app_smoker_label,
                "document_value": "Non-smoker" if doc_smoking == "NON_SMOKER" else "Smoker",
                "status": "MATCH",
                "details": f"Medical document confirms applicant smoking disclosure ({app_smoker_label})."
            })

    # -------------------------------------------------------------------------
    # 5. BMI Check (if recorded in medical report)
    # -------------------------------------------------------------------------
    doc_bmi = extracted_fields.get("bmi")
    app_bmi = getattr(application, "bmi", None)

    if doc_bmi is not None and app_bmi is not None:
        if abs(doc_bmi - app_bmi) <= 2.5:
            checks.append({
                "field": "bmi",
                "label": "Body Mass Index (BMI)",
                "application_value": f"{app_bmi:.1f}",
                "document_value": f"{doc_bmi:.1f}",
                "status": "MATCH",
                "details": f"Document BMI ({doc_bmi:.1f}) is consistent with application BMI ({app_bmi:.1f})."
            })
        else:
            discrepancy_count += 1
            checks.append({
                "field": "bmi",
                "label": "Body Mass Index (BMI)",
                "application_value": f"{app_bmi:.1f}",
                "document_value": f"{doc_bmi:.1f}",
                "status": "MISMATCH",
                "details": f"BMI discrepancy: medical record reports BMI {doc_bmi:.1f} vs disclosed BMI {app_bmi:.1f}."
            })

    # Summary generator
    if discrepancy_count > 0:
        summary = f"Flagged {discrepancy_count} discrepancy(ies) between document data and application disclosures. Underwriter review recommended."
    else:
        match_count = sum(1 for c in checks if c["status"] == "MATCH")
        summary = f"Document data verified: {match_count} field(s) match application disclosures without discrepancies."

    return checks, discrepancy_count, summary
