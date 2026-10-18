from app import db
from app.ai import analyze_match, evaluate_answer, generate_interview_questions
from app.models import InterviewQuestion, MatchAnalysis, PracticeAnswer, utc_now


def generate_questions_for(application):
    questions = generate_interview_questions(
        application.company,
        application.role,
        (application.job_description or "").strip(),
    )

    InterviewQuestion.query.filter_by(application_id=application.id).delete()
    for q in questions:
        db.session.add(InterviewQuestion(application_id=application.id, **q))


def run_match_analysis(application, resume):
    result = analyze_match(
        application.role,
        (application.job_description or "").strip(),
        resume.text,
    )

    match = MatchAnalysis.query.filter_by(
        application_id=application.id, resume_id=resume.id
    ).first()
    if match is None:
        match = MatchAnalysis(application_id=application.id, resume_id=resume.id)
        db.session.add(match)

    for field, value in result.items():
        setattr(match, field, value)
    match.analyzed_at = utc_now()


def run_answer_feedback(question, answer_text):
    result = evaluate_answer(
        question.application.role,
        question.category,
        question.question,
        answer_text,
    )
    db.session.add(PracticeAnswer(question_id=question.id, answer=answer_text, **result))