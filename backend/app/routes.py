from datetime import date, timedelta

from flask import Blueprint, current_app, g, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from redis.exceptions import RedisError
from sqlalchemy import func
from werkzeug.utils import secure_filename

from app import db
from app.models import (
    JOB_ACTIVE_STATUSES,
    AIJob,
    Application,
    InterviewQuestion,
    MatchAnalysis,
    PracticeAnswer,
    Resume,
    utc_now,
)
from app.resumes import ResumeError, extract_pdf_text
from app.tasks import enqueue_job

bp = Blueprint("api", __name__)

VALID_STATUSES = {"Applied", "Interview", "Offer", "Rejected"}
EDITABLE_FIELDS = ("company", "role", "status", "job_description", "resume_id", "applied_date")
MIN_JOB_DESCRIPTION_LENGTH = 50
MIN_ANSWER_LENGTH = 20
MAX_ANSWER_LENGTH = 4000
PUBLIC_ENDPOINTS = {"api.health"}


# ---------- Authentication ----------

@bp.before_request
def require_login():
    """Every route in this blueprint requires a signed-in user unless listed as public."""
    if request.method == "OPTIONS" or request.endpoint in PUBLIC_ENDPOINTS:
        return None
    verify_jwt_in_request()
    g.user_id = int(get_jwt_identity())
    return None


# ---------- Ownership helpers ----------

def owned_application(app_id):
    return Application.query.filter_by(id=app_id, user_id=g.user_id).first()


def owned_resume(resume_id):
    return Resume.query.filter_by(id=resume_id, user_id=g.user_id).first()


def owned_question(question_id):
    return (
        InterviewQuestion.query.join(Application, InterviewQuestion.application_id == Application.id)
        .filter(InterviewQuestion.id == question_id, Application.user_id == g.user_id)
        .first()
    )


def owned_job(job_id):
    return (
        AIJob.query.join(Application, AIJob.application_id == Application.id)
        .filter(AIJob.id == job_id, Application.user_id == g.user_id)
        .first()
    )


# ---------- Helpers ----------

def not_found():
    return jsonify({"error": "application not found"}), 404


def question_not_found():
    return jsonify({"error": "question not found"}), 404


def find_resume(resume_id):
    """Return (resume, None) if it's valid and yours, or (None, error_response) if not."""
    if not isinstance(resume_id, int) or isinstance(resume_id, bool):
        return None, (jsonify({"error": "resume_id must be a number"}), 400)
    resume = owned_resume(resume_id)
    if resume is None:
        return None, (jsonify({"error": "resume not found"}), 400)
    return resume, None


def parse_applied_date(value):
    """Return (date, None) if valid, or (None, error_response) if not."""
    error = (jsonify({"error": "applied_date must be a date like 2026-10-12"}), 400)
    if not isinstance(value, str):
        return None, error
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        return None, error
    if parsed > date.today():
        return None, (jsonify({"error": "applied_date can't be in the future"}), 400)
    return parsed, None


def usable_job_description(application):
    text = (application.job_description or "").strip()
    return text if len(text) >= MIN_JOB_DESCRIPTION_LENGTH else None


def job_description_error():
    return jsonify({"error": "Add a job description of at least a few sentences first"}), 400


def ai_jobs_in_last_day():
    since = utc_now() - timedelta(days=1)
    return (
        AIJob.query.join(Application, AIJob.application_id == Application.id)
        .filter(Application.user_id == g.user_id, AIJob.created_at >= since)
        .count()
    )


def start_job(kind, application, resume=None, question=None, input_text=None):
    """Create an AI job (or reuse an active one) and hand it to the queue."""
    if kind != "feedback":
        active = AIJob.query.filter(
            AIJob.application_id == application.id,
            AIJob.kind == kind,
            AIJob.status.in_(JOB_ACTIVE_STATUSES),
        )
        if resume is not None:
            active = active.filter(AIJob.resume_id == resume.id)

        existing = active.first()
        if existing is not None:
            return jsonify(existing.to_dict()), 202

    limit = current_app.config["AI_DAILY_JOB_LIMIT"]
    if ai_jobs_in_last_day() >= limit:
        return jsonify(
            {"error": f"You've used all {limit} AI requests for today. Please try again tomorrow."}
        ), 429

    job = AIJob(
        kind=kind,
        application_id=application.id,
        resume_id=resume.id if resume else None,
        question_id=question.id if question else None,
        input_text=input_text,
    )
    db.session.add(job)
    db.session.commit()

    try:
        enqueue_job(job.id)
    except RedisError:
        current_app.logger.exception("Could not enqueue AI job %s", job.id)
        job.status = "failed"
        job.error = "The AI service is temporarily unavailable. Please try again soon."
        job.finished_at = utc_now()
        db.session.commit()
        return jsonify({"error": job.error}), 503

    db.session.refresh(job)
    return jsonify(job.to_dict()), 202


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
    apps = (
        Application.query.filter_by(user_id=g.user_id)
        .order_by(Application.applied_date.desc())
        .all()
    )
    return jsonify([a.to_dict() for a in apps])


@bp.post("/applications")
def create_application():
    data = request.get_json(silent=True) or {}

    if not data.get("company") or not data.get("role"):
        return jsonify({"error": "company and role are required"}), 400

    status = data.get("status", "Applied")
    if status not in VALID_STATUSES:
        return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400

    applied_date = date.today()
    if data.get("applied_date"):
        applied_date, error = parse_applied_date(data["applied_date"])
        if error:
            return error

    application = Application(
        user_id=g.user_id,
        company=data["company"],
        role=data["role"],
        status=status,
        applied_date=applied_date,
        job_description=data.get("job_description"),
    )
    db.session.add(application)
    db.session.commit()
    return jsonify(application.to_dict()), 201


@bp.get("/applications/<int:app_id>")
def get_application(app_id):
    application = owned_application(app_id)
    if application is None:
        return not_found()
    return jsonify(application.to_dict())


@bp.patch("/applications/<int:app_id>")
def update_application(app_id):
    application = owned_application(app_id)
    if application is None:
        return not_found()

    data = dict(request.get_json(silent=True) or {})

    if "status" in data and data["status"] not in VALID_STATUSES:
        return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400
    for field in ("company", "role"):
        if field in data and not data[field]:
            return jsonify({"error": f"{field} cannot be empty"}), 400

    if data.get("resume_id") is not None:
        _, error = find_resume(data["resume_id"])
        if error:
            return error

    if "applied_date" in data:
        data["applied_date"], error = parse_applied_date(data["applied_date"])
        if error:
            return error

    for field in EDITABLE_FIELDS:
        if field in data:
            setattr(application, field, data[field])

    db.session.commit()
    return jsonify(application.to_dict())


@bp.delete("/applications/<int:app_id>")
def delete_application(app_id):
    application = owned_application(app_id)
    if application is None:
        return not_found()

    db.session.delete(application)
    db.session.commit()
    return "", 204


# ---------- Interview questions (AI) ----------

@bp.get("/applications/<int:app_id>/questions")
def list_questions(app_id):
    application = owned_application(app_id)
    if application is None:
        return not_found()
    return jsonify([q.to_dict() for q in application.questions])


@bp.post("/applications/<int:app_id>/questions")
def create_questions(app_id):
    application = owned_application(app_id)
    if application is None:
        return not_found()

    if usable_job_description(application) is None:
        return job_description_error()

    return start_job("questions", application)


# ---------- Resume match (AI) ----------

@bp.get("/applications/<int:app_id>/matches")
def list_matches(app_id):
    application = owned_application(app_id)
    if application is None:
        return not_found()

    matches = (
        MatchAnalysis.query.filter_by(application_id=app_id)
        .order_by(MatchAnalysis.score.desc())
        .all()
    )
    return jsonify([m.to_dict() for m in matches])


@bp.post("/applications/<int:app_id>/match")
def create_match(app_id):
    application = owned_application(app_id)
    if application is None:
        return not_found()

    data = request.get_json(silent=True) or {}
    resume_id = data.get("resume_id", application.resume_id)
    if resume_id is None:
        return jsonify({"error": "Link a resume to this application first"}), 400

    resume, error = find_resume(resume_id)
    if error:
        return error

    if usable_job_description(application) is None:
        return job_description_error()

    return start_job("match", application, resume)


# ---------- Practice answers (AI) ----------

@bp.get("/questions/<int:question_id>/answers")
def list_answers(question_id):
    question = owned_question(question_id)
    if question is None:
        return question_not_found()
    return jsonify([a.to_dict() for a in question.answers])


@bp.post("/questions/<int:question_id>/answers")
def submit_answer(question_id):
    question = owned_question(question_id)
    if question is None:
        return question_not_found()

    data = request.get_json(silent=True) or {}
    answer = data.get("answer")
    if not isinstance(answer, str):
        return jsonify({"error": "answer is required"}), 400

    answer = answer.strip()
    if len(answer) < MIN_ANSWER_LENGTH:
        return jsonify({"error": "Write a fuller answer before asking for feedback"}), 400
    if len(answer) > MAX_ANSWER_LENGTH:
        return jsonify({"error": f"Answers can be at most {MAX_ANSWER_LENGTH} characters"}), 400

    return start_job("feedback", question.application, question=question, input_text=answer)


# ---------- AI jobs ----------

@bp.get("/jobs/<job_id>")
def get_job(job_id):
    job = owned_job(job_id)
    if job is None:
        return jsonify({"error": "job not found"}), 404
    return jsonify(job.to_dict())


# ---------- Insights (dashboard and resumes pages) ----------

def grouped(query):
    """Turn rows of (key, value) into a dict."""
    return {key: value for key, value in query.all()}


@bp.get("/insights")
def insights():
    question_counts = grouped(
        db.session.query(InterviewQuestion.application_id, func.count(InterviewQuestion.id))
        .join(Application, InterviewQuestion.application_id == Application.id)
        .filter(Application.user_id == g.user_id)
        .group_by(InterviewQuestion.application_id)
    )
    practiced_counts = grouped(
        db.session.query(
            InterviewQuestion.application_id, func.count(func.distinct(InterviewQuestion.id))
        )
        .join(PracticeAnswer, PracticeAnswer.question_id == InterviewQuestion.id)
        .join(Application, InterviewQuestion.application_id == Application.id)
        .filter(Application.user_id == g.user_id)
        .group_by(InterviewQuestion.application_id)
    )
    best_scores = grouped(
        db.session.query(MatchAnalysis.application_id, func.max(MatchAnalysis.score))
        .join(Application, MatchAnalysis.application_id == Application.id)
        .filter(Application.user_id == g.user_id)
        .group_by(MatchAnalysis.application_id)
    )
    resume_usage = grouped(
        db.session.query(Application.resume_id, func.count(Application.id))
        .filter(Application.user_id == g.user_id, Application.resume_id.isnot(None))
        .group_by(Application.resume_id)
    )
    resume_scores = {
        resume_id: (count, average)
        for resume_id, count, average in db.session.query(
            MatchAnalysis.resume_id, func.count(MatchAnalysis.id), func.avg(MatchAnalysis.score)
        )
        .join(Resume, MatchAnalysis.resume_id == Resume.id)
        .filter(Resume.user_id == g.user_id)
        .group_by(MatchAnalysis.resume_id)
    }

    application_ids = [
        row.id for row in db.session.query(Application.id).filter(Application.user_id == g.user_id)
    ]
    resume_ids = [row.id for row in db.session.query(Resume.id).filter(Resume.user_id == g.user_id)]

    def resume_entry(resume_id):
        count, average = resume_scores.get(resume_id, (0, None))
        return {
            "id": resume_id,
            "application_count": resume_usage.get(resume_id, 0),
            "analyzed_count": count,
            "average_match_score": round(float(average)) if average is not None else None,
        }

    return jsonify(
        {
            "applications": [
                {
                    "id": app_id,
                    "question_count": question_counts.get(app_id, 0),
                    "practiced_count": practiced_counts.get(app_id, 0),
                    "best_match_score": best_scores.get(app_id),
                }
                for app_id in application_ids
            ],
            "resumes": [resume_entry(resume_id) for resume_id in resume_ids],
        }
    )


# ---------- Resumes ----------

@bp.get("/resumes")
def list_resumes():
    resumes = (
        Resume.query.filter_by(user_id=g.user_id).order_by(Resume.created_at.desc()).all()
    )
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
    resume = Resume(user_id=g.user_id, label=label, filename=filename, text=text)
    db.session.add(resume)
    db.session.commit()
    return jsonify(resume.to_dict()), 201


@bp.delete("/resumes/<int:resume_id>")
def delete_resume(resume_id):
    resume = owned_resume(resume_id)
    if resume is None:
        return jsonify({"error": "resume not found"}), 404
    db.session.delete(resume)
    db.session.commit()
    return "", 204