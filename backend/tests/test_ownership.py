from app import db
from app.models import Resume

JOB_DESCRIPTION = (
    "We are hiring a backend engineer to build REST APIs with Python and Flask, "
    "design PostgreSQL schemas, and deploy services with Docker."
)


def fake_questions(monkeypatch):
    monkeypatch.setattr(
        "app.services.generate_interview_questions",
        lambda company, role, job_description: [
            {"category": "technical", "question": "What is a database index?"}
        ],
    )


def test_other_users_cannot_see_or_change_my_application(client, make_client):
    app_id = client.post("/applications", json={"company": "Stripe", "role": "SWE"}).get_json()["id"]
    other = make_client("other@example.com")

    assert other.get("/applications").get_json() == []
    assert other.get(f"/applications/{app_id}").status_code == 404
    assert other.patch(f"/applications/{app_id}", json={"status": "Offer"}).status_code == 404
    assert other.delete(f"/applications/{app_id}").status_code == 404

    assert client.get(f"/applications/{app_id}").get_json()["status"] == "Applied"


def test_cannot_use_another_users_resume(app, client, make_client):
    other = make_client("other@example.com")
    with app.app_context():
        resume = Resume(user_id=other.user_id, label="Theirs", filename="t.pdf", text="their resume")
        db.session.add(resume)
        db.session.commit()
        resume_id = resume.id

    app_id = client.post("/applications", json={"company": "Stripe", "role": "SWE"}).get_json()["id"]

    assert client.patch(f"/applications/{app_id}", json={"resume_id": resume_id}).status_code == 400
    assert client.delete(f"/resumes/{resume_id}").status_code == 404
    assert client.get("/resumes").get_json() == []


def test_cannot_access_another_users_questions_answers_or_jobs(client, make_client, monkeypatch):
    fake_questions(monkeypatch)
    payload = {"company": "Stripe", "role": "SWE", "job_description": JOB_DESCRIPTION}
    app_id = client.post("/applications", json=payload).get_json()["id"]
    job_id = client.post(f"/applications/{app_id}/questions").get_json()["id"]
    question_id = client.get(f"/applications/{app_id}/questions").get_json()[0]["id"]

    other = make_client("other@example.com")
    answer = {"answer": "An index speeds up lookups by keeping a sorted structure."}

    assert other.get(f"/applications/{app_id}/questions").status_code == 404
    assert other.get(f"/questions/{question_id}/answers").status_code == 404
    assert other.post(f"/questions/{question_id}/answers", json=answer).status_code == 404
    assert other.get(f"/jobs/{job_id}").status_code == 404


def test_insights_only_include_my_data(client, make_client):
    client.post("/applications", json={"company": "Stripe", "role": "SWE"})
    other = make_client("other@example.com")

    assert other.get("/insights").get_json() == {"applications": [], "resumes": []}
    assert len(client.get("/insights").get_json()["applications"]) == 1


def test_daily_ai_limit(app, client, monkeypatch):
    app.config["AI_DAILY_JOB_LIMIT"] = 1
    fake_questions(monkeypatch)
    payload = {"company": "Stripe", "role": "SWE", "job_description": JOB_DESCRIPTION}
    app_id = client.post("/applications", json=payload).get_json()["id"]

    assert client.post(f"/applications/{app_id}/questions").status_code == 202
    assert client.post(f"/applications/{app_id}/questions").status_code == 429