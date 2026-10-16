from app import db
from app.models import AIJob

JOB_DESCRIPTION = (
    "We are hiring a backend engineer to build REST APIs with Python and Flask, "
    "design PostgreSQL schemas, and deploy services with Docker."
)


def add_application(client):
    payload = {"company": "Google", "role": "SWE", "job_description": JOB_DESCRIPTION}
    return client.post("/applications", json=payload).get_json()["id"]


def test_unknown_job_returns_404(client):
    assert client.get("/jobs/does-not-exist").status_code == 404


def test_duplicate_request_returns_active_job(app, client):
    app_id = add_application(client)
    with app.app_context():
        job = AIJob(kind="questions", application_id=app_id)
        db.session.add(job)
        db.session.commit()
        active_id = job.id

    response = client.post(f"/applications/{app_id}/questions")
    assert response.status_code == 202
    assert response.get_json()["id"] == active_id


def test_queue_unavailable_returns_503(app, client):
    app.config["TASKS_EAGER"] = False
    app.config["REDIS_URL"] = "redis://localhost:1/0"  # nothing listens on port 1

    app_id = add_application(client)
    response = client.post(f"/applications/{app_id}/questions")
    assert response.status_code == 503

    with app.app_context():
        job = AIJob.query.one()
        assert job.status == "failed"