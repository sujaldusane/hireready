from flask import Blueprint, jsonify, request
from app import db
from app.models import Application

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