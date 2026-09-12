import os
import shutil
import logging
from pathlib import Path
from typing import Tuple, Optional
from PIL import Image
import pypdf
import pypdfium2

logger = logging.getLogger("insureai.ocr")

# Configure pytesseract path if available on the system
import pytesseract

def find_tesseract_binary() -> Optional[str]:
    """Finds tesseract binary in PATH or common Windows installation directories."""
    env_path = os.environ.get("TESSERACT_CMD")
    if env_path and os.path.isfile(env_path):
        return env_path

    which_path = shutil.which("tesseract")
    if which_path:
        return which_path

    common_windows_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
    ]
    for p in common_windows_paths:
        if os.path.isfile(p):
            return p

    return None

TESSERACT_EXE = find_tesseract_binary()
if TESSERACT_EXE:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_EXE
    logger.info(f"Tesseract OCR engine configured: {TESSERACT_EXE}")
else:
    logger.info("Tesseract OCR binary not detected on host system. Embedded PDF text extraction will operate natively; image OCR will report dependency requirement.")


def is_tesseract_available() -> bool:
    """Returns True if local Tesseract OCR engine is functional."""
    return TESSERACT_EXE is not None


def extract_text_from_pdf(file_path: Path) -> Tuple[str, str, bool, Optional[str]]:
    """
    Hybrid PDF extraction pipeline:
    1. Try native embedded text extraction via pypdf.
    2. If no text or sparse text (scanned PDF), render pages to images and run OCR if Tesseract is available.

    Returns:
        (extracted_text, method, success, note)
    """
    extracted_pages = []
    try:
        reader = pypdf.PdfReader(str(file_path))
        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                extracted_pages.append(text.strip())
    except Exception as exc:
        logger.warning(f"Native PDF text extraction encountered error: {exc}")

    combined_text = "\n\n".join(extracted_pages).strip()

    # If substantial embedded text was extracted (>= 25 characters), return it directly
    if len(combined_text) >= 25:
        logger.info(f"Successfully extracted {len(combined_text)} characters of embedded text from PDF: {file_path.name}")
        return combined_text, "EMBEDDED_PDF_TEXT", True, None

    # Step 2: PDF is scanned / raster image only
    logger.info(f"PDF {file_path.name} contains no embedded text layer. Attempting scanned page image rendering.")
    if not is_tesseract_available():
        msg = (
            "This PDF is a scanned document without embedded text. "
            "To perform OCR on scanned pages, please install Tesseract-OCR on the server host "
            "(e.g., https://github.com/UB-Mannheim/tesseract/wiki)."
        )
        return "", "SCANNED_PDF_NEEDS_TESSERACT", False, msg

    try:
        # Render pages using pypdfium2 (bundles native PDFium, no external Poppler binary needed)
        pdf = pypdfium2.PdfDocument(str(file_path))
        ocr_texts = []
        max_pages = min(len(pdf), 4)  # Process up to 4 pages for underwriting documents

        for i in range(max_pages):
            page = pdf[i]
            # Render at 200 DPI (scale=2.77) for high-accuracy OCR
            pil_image = page.render(scale=2.5).to_pil()
            page_text = pytesseract.image_to_string(pil_image)
            if page_text.strip():
                ocr_texts.append(page_text.strip())

        scanned_result = "\n\n".join(ocr_texts).strip()
        if scanned_result:
            return scanned_result, "TESSERACT_OCR_SCANNED_PDF", True, None
        else:
            return "", "OCR_NO_TEXT_FOUND", False, "OCR executed on scanned PDF pages, but no legible text was detected."
    except Exception as exc:
        logger.error(f"Failed to render or OCR scanned PDF: {exc}")
        return "", "FAILED_EXTRACTION", False, f"Scanned PDF processing failed: {str(exc)}"


def extract_text_from_image(file_path: Path) -> Tuple[str, str, bool, Optional[str]]:
    """
    Extracts text from PNG, JPG, or JPEG images using Tesseract OCR.

    Returns:
        (extracted_text, method, success, note)
    """
    if not is_tesseract_available():
        msg = (
            "Image document uploaded. Local optical character recognition requires Tesseract-OCR "
            "installed on the server host (https://github.com/UB-Mannheim/tesseract/wiki)."
        )
        return "", "IMAGE_NEEDS_TESSERACT", False, msg

    try:
        with Image.open(str(file_path)) as img:
            # Preprocessing: convert to grayscale for better contrast
            gray_img = img.convert("L")
            text = pytesseract.image_to_string(gray_img).strip()

        if text:
            return text, "TESSERACT_OCR_IMAGE", True, None
        else:
            return "", "OCR_NO_TEXT_FOUND", False, "OCR scanned the image, but no legible text was recognized."
    except Exception as exc:
        logger.error(f"Image OCR failed for {file_path.name}: {exc}")
        return "", "FAILED_EXTRACTION", False, f"Image OCR failed: {str(exc)}"


def process_document(
    file_path: Path,
    detected_mime: str
) -> Tuple[str, str, bool, Optional[str]]:
    """
    Main dispatch function for document text extraction.
    """
    if not file_path.exists():
        return "", "FILE_NOT_FOUND", False, f"File {file_path} not found on disk."

    if detected_mime == "application/pdf":
        return extract_text_from_pdf(file_path)
    elif detected_mime in ("image/png", "image/jpeg"):
        return extract_text_from_image(file_path)
    else:
        return "", "UNSUPPORTED_MIME", False, f"Unsupported MIME type: {detected_mime}"
