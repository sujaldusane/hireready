from flask import Blueprint, jsonify, request
from app import db
from app.models import Application

bp = Blueprint("api", __name__)

VALID_STATUSES = {"Applied", "Interview", "Offer", "Rejected"}

@bp.get("/health")
def health():
    return jsonify({"status": "ok"})

@bp.get("/applications")
def list_applications():
    apps = Application.query.order_by(Application.applied_date.desc()).all()
    return jsonify([a.to_dict() for a in apps])

@bp.post("/applications")
def create_application():
    data = request.get_json() or {}

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