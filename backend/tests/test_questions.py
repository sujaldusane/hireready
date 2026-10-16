import pytest

from app.ai import AIError, parse_questions

JOB_DESCRIPTION = (
    "We are hiring a backend engineer to build REST APIs with Python and Flask, "
    "design PostgreSQL schemas, and deploy services with Docker."
)

FAKE_QUESTIONS = [
    {"category": "technical", "question": "How would you design a REST API in Flask?"},
    {"category": "behavioral", "question": "Tell me about a time you fixed a production bug."},
]


@pytest.fixture
def fake_ai(monkeypatch):
    calls = []

    def fake_generate(company, role, job_description):
        calls.append(company)
        return FAKE_QUESTIONS

    monkeypatch.setattr("app.services.generate_interview_questions", fake_generate)
    return calls


def break_ai(monkeypatch):
    def broken(company, role, job_description):
        raise AIError("simulated failure")

    monkeypatch.setattr("app.services.generate_interview_questions", broken)


def create(client, **overrides):
    payload = {"company": "Google", "role": "Backend Engineer", **overrides}
    return client.post("/applications", json=payload).get_json()["id"]


def generate(client, app_id):
    return client.post(f"/applications/{app_id}/questions")


def test_generate_requires_job_description(client, fake_ai):
    app_id = create(client)
    response = generate(client, app_id)
    assert response.status_code == 400
    assert fake_ai == []


def test_generate_runs_job_and_saves_questions(client, fake_ai):
    app_id = create(client, job_description=JOB_DESCRIPTION)
    response = generate(client, app_id)

    assert response.status_code == 202
    job = response.get_json()
    assert job["kind"] == "questions"
    assert job["status"] == "succeeded"

    saved = client.get(f"/applications/{app_id}/questions").get_json()
    assert [q["question"] for q in saved] == [q["question"] for q in FAKE_QUESTIONS]


def test_job_status_can_be_fetched(client, fake_ai):
    app_id = create(client, job_description=JOB_DESCRIPTION)
    job_id = generate(client, app_id).get_json()["id"]

    response = client.get(f"/jobs/{job_id}")
    assert response.status_code == 200
    assert response.get_json()["status"] == "succeeded"


def test_regenerate_replaces_questions(client, fake_ai):
    app_id = create(client, job_description=JOB_DESCRIPTION)
    generate(client, app_id)
    generate(client, app_id)
    saved = client.get(f"/applications/{app_id}/questions").get_json()
    assert len(saved) == 2


def test_ai_failure_marks_job_failed_and_keeps_old_questions(client, fake_ai, monkeypatch):
    app_id = create(client, job_description=JOB_DESCRIPTION)
    generate(client, app_id)

    break_ai(monkeypatch)
    job = generate(client, app_id).get_json()
    assert job["status"] == "failed"
    assert "Could not generate" in job["error"]

    saved = client.get(f"/applications/{app_id}/questions").get_json()
    assert len(saved) == 2


def test_deleting_application_deletes_questions(client, fake_ai):
    app_id = create(client, job_description=JOB_DESCRIPTION)
    generate(client, app_id)
    client.delete(f"/applications/{app_id}")
    assert client.get(f"/applications/{app_id}/questions").status_code == 404


def test_parse_handles_code_fences():
    text = '```json\n[{"category": "technical", "question": "What is REST?"}]\n```'
    assert parse_questions(text) == [{"category": "technical", "question": "What is REST?"}]


def test_parse_fixes_unknown_category():
    text = '[{"category": "trivia", "question": "What is Docker?"}]'
    assert parse_questions(text)[0]["category"] == "technical"


def test_parse_rejects_invalid_json():
    with pytest.raises(AIError):
        parse_questions("Sure! Here are some questions...")