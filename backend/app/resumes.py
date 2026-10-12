from pypdf import PdfReader

MAX_PAGES = 5
MAX_CHARS = 20_000
MIN_CHARS = 200


class ResumeError(Exception):
    """Raised when an uploaded resume can't be used."""


def extract_pdf_text(stream):
    try:
        reader = PdfReader(stream)
        if reader.is_encrypted:
            raise ResumeError("Password-protected PDFs aren't supported.")
        if len(reader.pages) > MAX_PAGES:
            raise ResumeError(f"Resumes can be at most {MAX_PAGES} pages.")
        raw = "\n".join(page.extract_text() or "" for page in reader.pages)
    except ResumeError:
        raise
    except Exception as exc:
        raise ResumeError("That file doesn't look like a valid PDF.") from exc

    text = "\n".join(line.strip() for line in raw.splitlines() if line.strip())

    if len(text) < MIN_CHARS:
        raise ResumeError(
            "Couldn't read enough text from this PDF. If it's a scanned image, "
            "export your resume as a text-based PDF instead."
        )
    return text[:MAX_CHARS]