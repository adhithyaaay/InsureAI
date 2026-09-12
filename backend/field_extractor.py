import re
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("insureai.extractor")


def normalize_doc_type(doc_type: str) -> str:
    """Normalizes various document type strings into canonical categories."""
    d = (doc_type or "").upper()
    if "PAN" in d:
        return "PAN_CARD"
    if "AADHAAR" in d or "ADHAAR" in d or "UIDAI" in d:
        return "AADHAAR_CARD"
    if "MEDIC" in d or "HEALTH" in d or "LAB" in d or "HOSPITAL" in d or "CLINIC" in d:
        return "MEDICAL_REPORT"
    if "INCOME" in d or "SALARY" in d or "PAYSLIP" in d:
        return "INCOME_PROOF"
    if "IDENT" in d or "PASSPORT" in d or "VOTER" in d or "LICENSE" in d:
        return "IDENTITY_DOCUMENT"
    return "OTHER"


def extract_pan_fields(text: str) -> Dict[str, Any]:
    """Extracts PAN card specific entities."""
    data: Dict[str, Any] = {}

    # 1. PAN Number pattern: 5 uppercase letters, 4 digits, 1 uppercase letter
    pan_match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", text)
    if pan_match:
        data["pan_number"] = pan_match.group(1)

    # 2. Date of Birth pattern (DD/MM/YYYY or DD-MM-YYYY)
    dob_match = re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b", text)
    if dob_match:
        data["dob"] = dob_match.group(1)

    # 3. Name extraction: usually appears after "Name" or before Father's Name
    name_match = re.search(r"(?:Name|NAME)[:\s]+([A-Za-z\s]{3,40})(?:\n|$|Father)", text)
    if name_match:
        clean_name = name_match.group(1).strip()
        if len(clean_name) > 2 and not any(kw in clean_name.upper() for kw in ["INCOME", "TAX", "DEPARTMENT", "GOVT", "INDIA"]):
            data["name"] = clean_name

    return data


def extract_aadhaar_fields(text: str) -> Dict[str, Any]:
    """Extracts Aadhaar card specific entities."""
    data: Dict[str, Any] = {}

    # 1. Aadhaar Number pattern: 12 digits, often in 4-digit groups (can be masked XXXX XXXX 1234)
    aadhaar_match = re.search(r"\b(\d{4}\s\d{4}\s\d{4})\b", text)
    if not aadhaar_match:
        aadhaar_match = re.search(r"\b([X\d]{4}\s[X\d]{4}\s\d{4})\b", text)
    if aadhaar_match:
        data["aadhaar_number"] = aadhaar_match.group(1)

    # 2. DOB pattern: DOB: DD/MM/YYYY or Year of Birth: YYYY
    dob_match = re.search(r"(?:DOB|Date of Birth)[:\s]*(\d{2}[/-]\d{2}[/-]\d{4})", text, re.IGNORECASE)
    if dob_match:
        data["dob"] = dob_match.group(1)
    else:
        yob_match = re.search(r"(?:Year of Birth|YOB)[:\s]*(\d{4})", text, re.IGNORECASE)
        if yob_match:
            data["year_of_birth"] = int(yob_match.group(1))

    # 3. Gender
    gender_match = re.search(r"\b(Male|Female|Transgender|MALE|FEMALE)\b", text)
    if gender_match:
        data["gender"] = gender_match.group(1).upper()

    # 4. Name: Look for name line
    name_match = re.search(r"(?:Name|NAME)[:\s]+([A-Za-z\s]{3,40})(?:\n|$|DOB)", text)
    if name_match:
        data["name"] = name_match.group(1).strip()

    return data


def extract_medical_fields(text: str) -> Dict[str, Any]:
    """Extracts medical vitals, smoker status, and patient info."""
    data: Dict[str, Any] = {}

    # 1. Patient Name
    name_match = re.search(r"(?:Patient Name|Patient|Name|Client)[:\s]+([A-Za-z\s]{3,40})(?:\n|,|Age|Sex|DOB|$)", text, re.IGNORECASE)
    if name_match:
        clean_name = name_match.group(1).strip()
        if len(clean_name) > 2 and not any(kw in clean_name.upper() for kw in ["REPORT", "HOSPITAL", "LAB", "DIAGNOSTIC"]):
            data["patient_name"] = clean_name

    # 2. Smoking / Tobacco status (Negative check first to avoid false positives)
    neg_smoker_pattern = r"\b(non-smoker|never smoked|denies (?:smoking|tobacco|nicotine)|tobacco(?:\s*use)?:\s*(?:no|negative|nil|none)|nicotine(?:\s*use)?:\s*(?:no|negative|nil|none)|smoker:\s*(?:no|negative|false)|no history of (?:smoking|tobacco))\b"
    pos_smoker_pattern = r"\b(current smoker|tobacco user|smoker:\s*(?:yes|positive|true)|history of smoking:\s*(?:yes|positive)|smokes \d+|nicotine(?:\s*use)?:\s*(?:yes|positive)|active smoker)\b"

    if re.search(neg_smoker_pattern, text, re.IGNORECASE):
        data["smoking_status"] = "NON_SMOKER"
        data["smoking_finding"] = "Medical document explicitly records patient as non-smoker / tobacco negative."
    elif re.search(pos_smoker_pattern, text, re.IGNORECASE):
        data["smoking_status"] = "SMOKER"
        data["smoking_finding"] = "Medical document indicates active smoking or positive tobacco use."

    # 3. BMI extraction
    bmi_match = re.search(r"\b(?:BMI|Body Mass Index)[:\s]*([1-9]\d(?:\.\d+)?)\b", text, re.IGNORECASE)
    if bmi_match:
        try:
            data["bmi"] = float(bmi_match.group(1))
        except ValueError:
            pass

    # 4. Blood pressure
    bp_match = re.search(r"\b(?:BP|Blood Pressure)[:\s]*(\d{2,3}/\d{2,3})\b", text, re.IGNORECASE)
    if bp_match:
        data["blood_pressure"] = bp_match.group(1)

    # 5. Key conditions mentioned
    conditions = []
    condition_keywords = ["diabetes", "hypertension", "asthma", "cholesterol", "normal vitals", "healthy"]
    for kw in condition_keywords:
        if re.search(rf"\b{kw}\b", text, re.IGNORECASE):
            conditions.append(kw.capitalize())
    if conditions:
        data["noted_conditions"] = conditions

    return data


def extract_structured_fields(text: str, doc_type: str) -> Dict[str, Any]:
    """
    Main extraction dispatcher. Returns a dictionary of structured fields
    tailored to the document category.
    """
    if not text:
        return {}

    category = normalize_doc_type(doc_type)

    if category == "PAN_CARD":
        fields = extract_pan_fields(text)
    elif category == "AADHAAR_CARD":
        fields = extract_aadhaar_fields(text)
    elif category == "MEDICAL_REPORT":
        fields = extract_medical_fields(text)
    else:
        # General / Other documents
        fields = {}
        # Try generic name/dob
        name_m = re.search(r"(?:Name)[:\s]+([A-Za-z\s]{3,40})", text, re.IGNORECASE)
        if name_m:
            fields["name"] = name_m.group(1).strip()
        dob_m = re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b", text)
        if dob_m:
            fields["dob"] = dob_m.group(1)

    # Cross-document generic fallback if specific extractor missed DOB
    if "dob" not in fields and "year_of_birth" not in fields:
        gen_dob = re.search(r"(?:DOB|Date of Birth)[:\s]*(\d{2}[/-]\d{2}[/-]\d{4})", text, re.IGNORECASE)
        if gen_dob:
            fields["dob"] = gen_dob.group(1)

    return fields
