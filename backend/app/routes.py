from flask import Blueprint, current_app, jsonify, request
from werkzeug.utils import secure_filename

from app import db
from app.ai import AIError, generate_interview_questions
from app.models import Application, InterviewQuestion, Resume
from app.resumes import ResumeError, extract_pdf_text

bp = Blueprint("api", __name__)

VALID_STATUSES = {"Applied", "Interview", "Offer", "Rejected"}
EDITABLE_FIELDS = ("company", "role", "status", "job_description", "resume_id")
MIN_JOB_DESCRIPTION_LENGTH = 50


def not_found():
    return jsonify({"error": "application not found"}), 404


# ---------- Errors ----------

@bp.app_errorhandler(413)
def file_too_large(error):
    return jsonify({"error": "File is too large. The maximum size is 5 MB."}), 413


# ---------- Health ----------

@bp.get("/health")
def health():
    return jsonify({"status": "ok"})


# ---------- Applications ----------

@bp.get("/applications")
def list_applications():
    apps = Application.query.order_by(Application.applied_date.desc()).all()
    return jsonify([a.to_dict() for a in apps])


@bp.post("/applications")
def create_application():
    data = request.get_json(silent=True) or {}

    if not data.get("company") or not data.get("role"):
        return jsonify({"error": "company and role are required"}), 400

    status = data.get("status", "Applied")
    if status not in VALID_STATUSES:
        return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400

    application = Application(
        company=data["company"],
        role=data["role"],
        status=status,
        job_description=data.get("job_description"),
    )
    db.session.add(application)
    db.session.commit()
    return jsonify(application.to_dict()), 201


@bp.get("/applications/<int:app_id>")
def get_application(app_id):
    application = db.session.get(Application, app_id)
    if application is None:
        return not_found()
    return jsonify(application.to_dict())


@bp.patch("/applications/<int:app_id>")
def update_application(app_id):
    application = db.session.get(Application, app_id)
    if application is None:
        return not_found()

    data = request.get_json(silent=True) or {}

    if "status" in data and data["status"] not in VALID_STATUSES:
        return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400
    for field in ("company", "role"):
        if field in data and not data[field]:
            return jsonify({"error": f"{field} cannot be empty"}), 400

    if "resume_id" in data and data["resume_id"] is not None:
        resume_id = data["resume_id"]
        if not isinstance(resume_id, int) or isinstance(resume_id, bool):
            return jsonify({"error": "resume_id must be a number"}), 400
        if db.session.get(Resume, resume_id) is None:
            return jsonify({"error": "resume not found"}), 400

    for field in EDITABLE_FIELDS:
        if field in data:
            setattr(application, field, data[field])

    db.session.commit()
    return jsonify(application.to_dict())


@bp.delete("/applications/<int:app_id>")
def delete_application(app_id):
    application = db.session.get(Application, app_id)
    if application is None:
        return not_found()

    db.session.delete(application)
    db.session.commit()
    return "", 204


# ---------- Interview questions (AI) ----------

@bp.get("/applications/<int:app_id>/questions")
def list_questions(app_id):
    application = db.session.get(Application, app_id)
    if application is None:
        return not_found()
    return jsonify([q.to_dict() for q in application.questions])


@bp.post("/applications/<int:app_id>/questions")
def create_questions(app_id):
    application = db.session.get(Application, app_id)
    if application is None:
        return not_found()

    job_description = (application.job_description or "").strip()
    if len(job_description) < MIN_JOB_DESCRIPTION_LENGTH:
        return jsonify({"error": "Add a job description of at least a few sentences first"}), 400

    try:
        questions = generate_interview_questions(
            application.company, application.role, job_description
        )
    except AIError:
        current_app.logger.exception("Interview question generation failed")
        return jsonify({"error": "Could not generate questions right now. Please try again."}), 502

    InterviewQuestion.query.filter_by(application_id=app_id).delete()
    for q in questions:
        db.session.add(InterviewQuestion(application_id=app_id, **q))
    db.session.commit()

    saved = (
        InterviewQuestion.query.filter_by(application_id=app_id)
        .order_by(InterviewQuestion.id)
        .all()
    )
    return jsonify([q.to_dict() for q in saved]), 201


# ---------- Resumes ----------

@bp.get("/resumes")
def list_resumes():
    resumes = Resume.query.order_by(Resume.created_at.desc()).all()
    return jsonify([r.to_dict() for r in resumes])


@bp.post("/resumes")
def upload_resume():
    file = request.files.get("file")
    if file is None or not file.filename:
        return jsonify({"error": "Choose a PDF file to upload"}), 400

    filename = secure_filename(file.filename) or "resume.pdf"
    if not filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are supported"}), 400

    try:
        text = extract_pdf_text(file.stream)
    except ResumeError as exc:
        return jsonify({"error": str(exc)}), 400

    label = (request.form.get("label") or "").strip()[:120] or filename
    resume = Resume(label=label, filename=filename, text=text)
    db.session.add(resume)
    db.session.commit()
    return jsonify(resume.to_dict()), 201


@bp.delete("/resumes/<int:resume_id>")
def delete_resume(resume_id):
    resume = db.session.get(Resume, resume_id)
    if resume is None:
        return jsonify({"error": "resume not found"}), 404
    db.session.delete(resume)
    db.session.commit()
    return "", 204