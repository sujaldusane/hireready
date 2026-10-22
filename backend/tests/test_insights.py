from app import db
from app.models import Application, InterviewQuestion, MatchAnalysis, PracticeAnswer, Resume


def seed(app):
    with app.app_context():
        resume_a = Resume(label="Resume A", filename="a.pdf", text="resume a text")
        resume_b = Resume(label="Resume B", filename="b.pdf", text="resume b text")
        stripe = Application(company="Stripe", role="SWE", resume=resume_a)
        google = Application(company="Google", role="SWE")
        db.session.add_all([resume_a, resume_b, stripe, google])
        db.session.flush()

        q1 = InterviewQuestion(application_id=stripe.id, category="technical", question="Q1")
        q2 = InterviewQuestion(application_id=stripe.id, category="behavioral", question="Q2")
        db.session.add_all([q1, q2])
        db.session.flush()

        db.session.add_all(
            [
                PracticeAnswer(question_id=q1.id, answer="first try", score=6),
                PracticeAnswer(question_id=q1.id, answer="second try", score=8),
                MatchAnalysis(application_id=stripe.id, resume_id=resume_a.id, score=70),
                MatchAnalysis(application_id=stripe.id, resume_id=resume_b.id, score=90),
                MatchAnalysis(application_id=google.id, resume_id=resume_b.id, score=81),
            ]
        )
        db.session.commit()
        return stripe.id, google.id, resume_a.id, resume_b.id


def test_insights_when_empty(client):
    assert client.get("/insights").get_json() == {"applications": [], "resumes": []}


def test_application_insights(app, client):
    stripe_id, google_id, _, _ = seed(app)
    data = {a["id"]: a for a in client.get("/insights").get_json()["applications"]}

    assert data[stripe_id] == {
        "id": stripe_id,
        "question_count": 2,
        "practiced_count": 1,
        "best_match_score": 90,
    }
    assert data[google_id]["question_count"] == 0
    assert data[google_id]["practiced_count"] == 0
    assert data[google_id]["best_match_score"] == 81


def test_resume_insights(app, client):
    _, _, resume_a_id, resume_b_id = seed(app)
    data = {r["id"]: r for r in client.get("/insights").get_json()["resumes"]}

    assert data[resume_a_id]["application_count"] == 1
    assert data[resume_a_id]["analyzed_count"] == 1
    assert data[resume_a_id]["average_match_score"] == 70

    assert data[resume_b_id]["application_count"] == 0
    assert data[resume_b_id]["analyzed_count"] == 2
    assert data[resume_b_id]["average_match_score"] == 86