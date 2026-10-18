from flask import current_app
from redis import Redis
from rq import Queue
from app.services import generate_questions_for, run_answer_feedback, run_match_analysis

from app import db
from app.ai import AIError
from app.models import AIJob, utc_now

QUEUE_NAME = "ai"
JOB_TIMEOUT_SECONDS = 120

FAILURE_MESSAGES = {
    "questions": "Could not generate questions right now. Please try again.",
    "match": "Could not analyze the match right now. Please try again.",
    "feedback": "Could not get feedback right now. Please try again.",
}

_worker_app = None


def enqueue_job(job_id):
    """Run the job now (eager mode) or put it on the Redis queue for a worker."""
    if current_app.config["TASKS_EAGER"]:
        process_job(job_id)
        return

    redis = Redis.from_url(current_app.config["REDIS_URL"])
    Queue(QUEUE_NAME, connection=redis).enqueue(
        execute, job_id, job_timeout=JOB_TIMEOUT_SECONDS
    )


def execute(job_id):
    """Entry point the RQ worker calls. Creates a Flask app context for the job."""
    global _worker_app
    if _worker_app is None:
        from app import create_app

        _worker_app = create_app()

    with _worker_app.app_context():
        process_job(job_id)


def process_job(job_id):
    job = db.session.get(AIJob, job_id)
    if job is None or job.status != "queued":
        return

    job.status = "running"
    job.started_at = utc_now()
    db.session.commit()

    try:
        if job.kind == "questions":
            generate_questions_for(job.application)
        elif job.kind == "match":
            run_match_analysis(job.application, job.resume)
        elif job.kind == "feedback":
            run_answer_feedback(job.question, job.input_text)
        else:
            raise ValueError(f"Unknown job kind: {job.kind}")
        job.status = "succeeded"
    except AIError:
        db.session.rollback()
        current_app.logger.exception("AI job %s failed", job_id)
        job.status = "failed"
        job.error = FAILURE_MESSAGES.get(job.kind, "The AI task failed.")
    except Exception:
        db.session.rollback()
        current_app.logger.exception("AI job %s crashed", job_id)
        job.status = "failed"
        job.error = "Something went wrong. Please try again."

    job.finished_at = utc_now()
    db.session.commit()