from flask import Blueprint, current_app, jsonify, request
from app import db
from app.ai import AIError, generate_interview_questions
from app.models import Application, InterviewQuestion


bp = Blueprint("api", __name__)

VALID_STATUSES = {"Applied", "Interview", "Offer", "Rejected"}
EDITABLE_FIELDS = ("company", "role", "status", "job_description")


def not_found():
    return jsonify({"error": "application not found"}), 404


@bp.get("/health")
def health():
    return jsonify({"status": "ok"})


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

MIN_JOB_DESCRIPTION_LENGTH = 50


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