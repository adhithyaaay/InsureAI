import os
import uuid
import logging
from pathlib import Path
from typing import Tuple, Optional

logger = logging.getLogger("insureai.storage")

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

ALLOWED_EXTENSIONS = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
}

# Magic bytes signatures for MIME verification
MAGIC_SIGNATURES = {
    b"%PDF-": "application/pdf",
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"\xff\xd8\xff": "image/jpeg",
}


def ensure_upload_dir() -> Path:
    """Ensures the base uploads directory exists."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOAD_DIR


def validate_file_security(
    file_bytes: bytes,
    original_filename: str,
    client_content_type: Optional[str] = None
) -> Tuple[bool, str, Optional[str]]:
    """
    Validates file size, extension, and binary magic bytes to prevent
    file spoofing, empty uploads, and malicious payload storage.

    Returns:
        (is_valid, detected_mime_type, error_message)
    """
    # 1. Non-empty check
    if not file_bytes or len(file_bytes) == 0:
        return False, "", "File is empty (0 bytes). Please select a valid document."

    # 2. Maximum file size check
    if len(file_bytes) > MAX_FILE_SIZE:
        max_mb = MAX_FILE_SIZE // (1024 * 1024)
        actual_mb = round(len(file_bytes) / (1024 * 1024), 2)
        return False, "", f"File size ({actual_mb} MB) exceeds maximum allowed limit of {max_mb} MB."

    # 3. Extension check
    safe_basename = os.path.basename(original_filename or "")
    _, ext = os.path.splitext(safe_basename.lower())
    if not ext or ext not in ALLOWED_EXTENSIONS:
        allowed = ", ".join(sorted(ALLOWED_EXTENSIONS.keys()))
        return False, "", f"Unsupported file extension '{ext}'. Allowed formats: {allowed}."

    expected_mime = ALLOWED_EXTENSIONS[ext]

    # 4. Binary header / magic byte check
    detected_mime = None
    for sig, mime in MAGIC_SIGNATURES.items():
        if file_bytes.startswith(sig):
            detected_mime = mime
            break

    if not detected_mime:
        return (
            False,
            "",
            f"File content does not match a valid {ext.upper()} format. File header validation failed."
        )

    # Cross check extension and magic bytes
    if detected_mime != expected_mime:
        return (
            False,
            "",
            f"File extension '{ext}' does not match its detected content type '{detected_mime}'."
        )

    return True, detected_mime, None


def save_uploaded_document(
    application_id: int,
    file_bytes: bytes,
    original_filename: str,
    detected_mime: str
) -> Tuple[str, str, int]:
    """
    Saves document bytes under a secure server-generated identifier.
    Directory structure: uploads/application_<id>/doc_<uuid>.<ext>

    Returns:
        (relative_storage_path, safe_identifier, file_size)
    """
    ensure_upload_dir()
    app_folder = UPLOAD_DIR / f"application_{application_id}"
    app_folder.mkdir(parents=True, exist_ok=True)

    safe_basename = os.path.basename(original_filename or "document")
    _, ext = os.path.splitext(safe_basename.lower())
    if not ext:
        ext = ".pdf" if detected_mime == "application/pdf" else ".png"

    # Server-generated random identifier
    doc_id = uuid.uuid4().hex[:12]
    safe_filename = f"doc_{doc_id}{ext}"
    target_path = app_folder / safe_filename

    with open(target_path, "wb") as f:
        f.write(file_bytes)

    relative_path = f"application_{application_id}/{safe_filename}"
    file_size = len(file_bytes)

    logger.info(
        f"Saved document for Application #{application_id} -> {relative_path} ({file_size} bytes)"
    )
    return relative_path, safe_filename, file_size


def get_safe_document_path(relative_storage_path: str) -> Optional[Path]:
    """
    Safely resolves a stored document path while strictly guarding
    against directory traversal attacks (e.g., ../ or absolute paths).
    """
    if not relative_storage_path:
        return None

    # Strip leading slashes and normalize
    clean_rel = os.path.normpath(relative_storage_path).lstrip("/\\")
    full_path = (UPLOAD_DIR / clean_rel).resolve()

    # Guard against path traversal
    try:
        if not full_path.is_relative_to(UPLOAD_DIR.resolve()):
            logger.warning(f"Path traversal attempt blocked: {relative_storage_path}")
            return None
    except AttributeError:
        # Fallback for older python Path compatibility if needed
        if not str(full_path).startswith(str(UPLOAD_DIR.resolve())):
            return None

    if not full_path.exists() or not full_path.is_file():
        logger.warning(f"Document file not found at path: {full_path}")
        return None

    return full_path
