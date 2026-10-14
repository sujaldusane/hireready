import pytest

from app import db
from app.ai import AIError, parse_match
from app.models import Resume

JOB_DESCRIPTION = (
    "We are hiring a backend engineer to build REST APIs with Python and Flask, "
    "design PostgreSQL schemas, and deploy services with Docker and Kubernetes."
)

FAKE_RESULT = {
    "score": 78,
    "summary": "Strong backend match with some infrastructure gaps.",
    "strengths": ["Flask REST APIs", "PostgreSQL"],
    "missing_keywords": ["Kubernetes"],
    "suggestions": ["Highlight your Docker deployment work"],
}

RESUME_SUFFIX = " text with Python and Flask experience"


@pytest.fixture
def fake_match(monkeypatch):
    calls = []

    def fake_analyze(role, job_description, resume_text):
        calls.append(resume_text)
        return dict(FAKE_RESULT)

    monkeypatch.setattr("app.routes.analyze_match", fake_analyze)
    return calls


def add_resume(app, label="Backend resume"):
    with app.app_context():
        resume = Resume(label=label, filename="resume.pdf", text=label + RESUME_SUFFIX)
        db.session.add(resume)
        db.session.commit()
        return resume.id


def add_application(client, **overrides):
    payload = {
        "company": "Stripe",
        "role": "Backend Engineer",
        "job_description": JOB_DESCRIPTION,
        **overrides,
    }
    return client.post("/applications", json=payload).get_json()["id"]


def link(client, app_id, resume_id):
    client.patch(f"/applications/{app_id}", json={"resume_id": resume_id})


def test_match_requires_resume(client, fake_match):
    app_id = add_application(client)
    response = client.post(f"/applications/{app_id}/match")
    assert response.status_code == 400
    assert fake_match == []


def test_match_requires_job_description(app, client, fake_match):
    resume_id = add_resume(app)
    app_id = add_application(client, job_description=None)
    link(client, app_id, resume_id)

    response = client.post(f"/applications/{app_id}/match")
    assert response.status_code == 400
    assert fake_match == []


def test_match_uses_linked_resume(app, client, fake_match):
    resume_id = add_resume(app)
    app_id = add_application(client)
    link(client, app_id, resume_id)

    response = client.post(f"/applications/{app_id}/match")
    assert response.status_code == 201
    data = response.get_json()
    assert data["score"] == 78
    assert data["resume_label"] == "Backend resume"
    assert data["missing_keywords"] == ["Kubernetes"]
    assert fake_match[0].startswith("Backend resume")


def test_match_with_explicit_resume(app, client, fake_match):
    linked_id = add_resume(app, "General resume")
    other_id = add_resume(app, "Backend resume")
    app_id = add_application(client)
    link(client, app_id, linked_id)

    response = client.post(f"/applications/{app_id}/match", json={"resume_id": other_id})
    assert response.status_code == 201
    assert response.get_json()["resume_id"] == other_id


def test_match_rejects_missing_resume(client, fake_match):
    app_id = add_application(client)
    response = client.post(f"/applications/{app_id}/match", json={"resume_id": 999})
    assert response.status_code == 400


def test_reanalyzing_replaces_result(app, client, fake_match):
    resume_id = add_resume(app)
    app_id = add_application(client)
    link(client, app_id, resume_id)

    client.post(f"/applications/{app_id}/match")
    client.post(f"/applications/{app_id}/match")

    matches = client.get(f"/applications/{app_id}/matches").get_json()
    assert len(matches) == 1


def test_compare_multiple_resumes(app, client, monkeypatch):
    scores = {"General resume": 55, "Backend resume": 85}

    def fake_analyze(role, job_description, resume_text):
        label = resume_text.removesuffix(RESUME_SUFFIX)
        return {**FAKE_RESULT, "score": scores[label]}

    monkeypatch.setattr("app.routes.analyze_match", fake_analyze)

    general_id = add_resume(app, "General resume")
    backend_id = add_resume(app, "Backend resume")
    app_id = add_application(client)

    client.post(f"/applications/{app_id}/match", json={"resume_id": general_id})
    client.post(f"/applications/{app_id}/match", json={"resume_id": backend_id})

    matches = client.get(f"/applications/{app_id}/matches").get_json()
    assert [m["resume_label"] for m in matches] == ["Backend resume", "General resume"]
    assert [m["score"] for m in matches] == [85, 55]


def test_ai_failure_returns_502_and_saves_nothing(app, client, monkeypatch):
    def broken(role, job_description, resume_text):
        raise AIError("simulated failure")

    monkeypatch.setattr("app.routes.analyze_match", broken)

    resume_id = add_resume(app)
    app_id = add_application(client)
    link(client, app_id, resume_id)

    response = client.post(f"/applications/{app_id}/match")
    assert response.status_code == 502
    assert client.get(f"/applications/{app_id}/matches").get_json() == []


def test_deleting_resume_deletes_its_matches(app, client, fake_match):
    resume_id = add_resume(app)
    app_id = add_application(client)
    link(client, app_id, resume_id)
    client.post(f"/applications/{app_id}/match")

    assert client.delete(f"/resumes/{resume_id}").status_code == 204
    assert client.get(f"/applications/{app_id}/matches").get_json() == []


def test_parse_match_clamps_score_and_cleans_lists():
    text = (
        '{"score": 140, "summary": "Good fit", "strengths": ["Python", 5, ""],'
        ' "missing_keywords": "Kubernetes", "suggestions": []}'
    )
    result = parse_match(text)
    assert result["score"] == 100
    assert result["strengths"] == ["Python"]
    assert result["missing_keywords"] == []


def test_parse_match_requires_score():
    with pytest.raises(AIError):
        parse_match('{"summary": "No score here"}')