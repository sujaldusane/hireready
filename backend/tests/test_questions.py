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

    monkeypatch.setattr("app.routes.generate_interview_questions", fake_generate)
    return calls


@pytest.fixture
def failing_ai(monkeypatch):
    def fake_generate(company, role, job_description):
        raise AIError("simulated failure")

    monkeypatch.setattr("app.routes.generate_interview_questions", fake_generate)


def create(client, **overrides):
    payload = {"company": "Google", "role": "Backend Engineer", **overrides}
    return client.post("/applications", json=payload).get_json()["id"]


def test_generate_requires_job_description(client, fake_ai):
    app_id = create(client)
    response = client.post(f"/applications/{app_id}/questions")
    assert response.status_code == 400
    assert fake_ai == []


def test_generate_saves_questions(client, fake_ai):
    app_id = create(client, job_description=JOB_DESCRIPTION)
    response = client.post(f"/applications/{app_id}/questions")
    assert response.status_code == 201
    assert len(response.get_json()) == 2

    saved = client.get(f"/applications/{app_id}/questions").get_json()
    assert saved[0]["question"] == FAKE_QUESTIONS[0]["question"]


def test_regenerate_replaces_questions(client, fake_ai):
    app_id = create(client, job_description=JOB_DESCRIPTION)
    client.post(f"/applications/{app_id}/questions")
    client.post(f"/applications/{app_id}/questions")
    saved = client.get(f"/applications/{app_id}/questions").get_json()
    assert len(saved) == 2


def test_ai_failure_returns_502_and_keeps_old_questions(client, fake_ai, monkeypatch):
    app_id = create(client, job_description=JOB_DESCRIPTION)
    client.post(f"/applications/{app_id}/questions")

    def broken(company, role, job_description):
        raise AIError("simulated failure")

    monkeypatch.setattr("app.routes.generate_interview_questions", broken)
    response = client.post(f"/applications/{app_id}/questions")
    assert response.status_code == 502

    saved = client.get(f"/applications/{app_id}/questions").get_json()
    assert len(saved) == 2


def test_deleting_application_deletes_questions(client, fake_ai):
    app_id = create(client, job_description=JOB_DESCRIPTION)
    client.post(f"/applications/{app_id}/questions")
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