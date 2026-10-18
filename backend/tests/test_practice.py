import pytest

from app import db
from app.ai import AIError, parse_feedback
from app.models import InterviewQuestion

GOOD_ANSWER = (
    "At my last internship, our deployments took hours, so I containerized the services "
    "with Docker and set up a CI pipeline, which cut our setup time significantly."
)

FAKE_FEEDBACK = {
    "score": 7,
    "summary": "Clear example with a good result, but the situation needs more context.",
    "strengths": ["Concrete technical actions"],
    "improvements": ["Explain the situation before the solution"],
}

JOB_DESCRIPTION = (
    "We are hiring a backend engineer to build REST APIs with Python and Flask, "
    "design PostgreSQL schemas, and deploy services with Docker."
)


@pytest.fixture
def fake_feedback(monkeypatch):
    calls = []

    def fake_evaluate(role, category, question, answer):
        calls.append(answer)
        return dict(FAKE_FEEDBACK)

    monkeypatch.setattr("app.services.evaluate_answer", fake_evaluate)
    return calls


def add_question(app, client):
    payload = {"company": "Google", "role": "SWE", "job_description": JOB_DESCRIPTION}
    app_id = client.post("/applications", json=payload).get_json()["id"]
    with app.app_context():
        question = InterviewQuestion(
            application_id=app_id,
            category="behavioral",
            question="Tell me about a time you improved a process.",
        )
        db.session.add(question)
        db.session.commit()
        return app_id, question.id


def submit(client, question_id, answer=GOOD_ANSWER):
    return client.post(f"/questions/{question_id}/answers", json={"answer": answer})


def test_answer_must_not_be_too_short(app, client, fake_feedback):
    _, question_id = add_question(app, client)
    response = submit(client, question_id, "idk")
    assert response.status_code == 400
    assert fake_feedback == []


def test_answer_must_not_be_too_long(app, client, fake_feedback):
    _, question_id = add_question(app, client)
    response = submit(client, question_id, "a" * 4001)
    assert response.status_code == 400
    assert fake_feedback == []


def test_unknown_question_returns_404(client, fake_feedback):
    assert submit(client, 999).status_code == 404


def test_submit_answer_saves_feedback(app, client, fake_feedback):
    _, question_id = add_question(app, client)
    response = submit(client, question_id)

    assert response.status_code == 202
    assert response.get_json()["status"] == "succeeded"

    answers = client.get(f"/questions/{question_id}/answers").get_json()
    assert len(answers) == 1
    assert answers[0]["score"] == 7
    assert answers[0]["answer"] == GOOD_ANSWER


def test_multiple_attempts_are_kept_newest_first(app, client, monkeypatch):
    scores = iter([5, 8])

    def fake_evaluate(role, category, question, answer):
        return {**FAKE_FEEDBACK, "score": next(scores)}

    monkeypatch.setattr("app.services.evaluate_answer", fake_evaluate)

    _, question_id = add_question(app, client)
    submit(client, question_id, GOOD_ANSWER)
    submit(client, question_id, GOOD_ANSWER + " The result was a faster release cycle.")

    answers = client.get(f"/questions/{question_id}/answers").get_json()
    assert [a["score"] for a in answers] == [8, 5]


def test_ai_failure_marks_job_failed_and_saves_nothing(app, client, monkeypatch):
    def broken(role, category, question, answer):
        raise AIError("simulated failure")

    monkeypatch.setattr("app.services.evaluate_answer", broken)

    _, question_id = add_question(app, client)
    job = submit(client, question_id).get_json()

    assert job["status"] == "failed"
    assert "Could not get feedback" in job["error"]
    assert client.get(f"/questions/{question_id}/answers").get_json() == []


def test_regenerating_questions_deletes_practice_answers(app, client, fake_feedback, monkeypatch):
    def fake_generate(company, role, job_description):
        return [{"category": "technical", "question": "What is a database index?"}]

    monkeypatch.setattr("app.services.generate_interview_questions", fake_generate)

    app_id, question_id = add_question(app, client)
    submit(client, question_id)

    client.post(f"/applications/{app_id}/questions")

    assert client.get(f"/questions/{question_id}/answers").status_code == 404


def test_parse_feedback_clamps_score_and_trims_lists():
    text = (
        '{"score": 15, "summary": "Strong", "strengths": ["a", "b", "c", "d"],'
        ' "improvements": ["x"]}'
    )
    result = parse_feedback(text)
    assert result["score"] == 10
    assert result["strengths"] == ["a", "b", "c"]
    assert parse_feedback('{"score": 0, "summary": "Weak"}')["score"] == 1


def test_parse_feedback_requires_score():
    with pytest.raises(AIError):
        parse_feedback('{"summary": "No score"}')