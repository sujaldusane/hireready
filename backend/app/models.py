import uuid
from datetime import date, datetime, timezone

from werkzeug.security import check_password_hash, generate_password_hash

from app import db

JOB_KINDS = ("questions", "match", "feedback")
JOB_ACTIVE_STATUSES = ("queued", "running")


def utc_now():
    return datetime.now(timezone.utc)


def new_job_id():
    return str(uuid.uuid4())


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=utc_now)

    applications = db.relationship("Application", backref="owner", cascade="all, delete-orphan")
    resumes = db.relationship("Resume", backref="owner", cascade="all, delete-orphan")
    refresh_tokens = db.relationship("RefreshToken", backref="user", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {"id": self.id, "email": self.email, "name": self.name}


class RefreshToken(db.Model):
    __tablename__ = "refresh_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash = db.Column(db.String(64), nullable=False, unique=True)
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=utc_now)


class Application(db.Model):
    __tablename__ = "applications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    company = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(120), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="Applied")
    applied_date = db.Column(db.Date, nullable=False, default=date.today)
    job_description = db.Column(db.Text)
    resume_id = db.Column(
        db.Integer,
        db.ForeignKey("resumes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_at = db.Column(db.DateTime, default=utc_now)

    questions = db.relationship(
        "InterviewQuestion",
        backref="application",
        cascade="all, delete-orphan",
        order_by="InterviewQuestion.id",
    )
    matches = db.relationship(
        "MatchAnalysis",
        backref="application",
        cascade="all, delete-orphan",
    )
    jobs = db.relationship(
        "AIJob",
        backref="application",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "company": self.company,
            "role": self.role,
            "status": self.status,
            "applied_date": self.applied_date.isoformat(),
            "job_description": self.job_description,
            "resume_id": self.resume_id,
        }


class InterviewQuestion(db.Model):
    __tablename__ = "interview_questions"

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(
        db.Integer,
        db.ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category = db.Column(db.String(20), nullable=False)
    question = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)

    answers = db.relationship(
        "PracticeAnswer",
        backref="question",
        cascade="all, delete-orphan",
        order_by="PracticeAnswer.created_at.desc()",
    )
    jobs = db.relationship(
        "AIJob",
        backref="question",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "category": self.category,
            "question": self.question,
            "attempt_count": len(self.answers),
        }


class PracticeAnswer(db.Model):
    __tablename__ = "practice_answers"

    id = db.Column(db.Integer, primary_key=True)
    question_id = db.Column(
        db.Integer,
        db.ForeignKey("interview_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    answer = db.Column(db.Text, nullable=False)
    score = db.Column(db.Integer, nullable=False)
    summary = db.Column(db.Text, nullable=False, default="")
    strengths = db.Column(db.JSON, nullable=False, default=list)
    improvements = db.Column(db.JSON, nullable=False, default=list)
    created_at = db.Column(db.DateTime, default=utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "question_id": self.question_id,
            "answer": self.answer,
            "score": self.score,
            "summary": self.summary,
            "strengths": self.strengths,
            "improvements": self.improvements,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Resume(db.Model):
    __tablename__ = "resumes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    label = db.Column(db.String(120), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now)

    applications = db.relationship("Application", backref="resume")
    matches = db.relationship(
        "MatchAnalysis",
        backref="resume",
        cascade="all, delete-orphan",
    )
    jobs = db.relationship(
        "AIJob",
        backref="resume",
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label,
            "filename": self.filename,
            "word_count": len(self.text.split()),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MatchAnalysis(db.Model):
    __tablename__ = "match_analyses"
    __table_args__ = (db.UniqueConstraint("application_id", "resume_id"),)

    id = db.Column(db.Integer, primary_key=True)
    application_id = db.Column(
        db.Integer,
        db.ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resume_id = db.Column(
        db.Integer,
        db.ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    score = db.Column(db.Integer, nullable=False)
    summary = db.Column(db.Text, nullable=False, default="")
    strengths = db.Column(db.JSON, nullable=False, default=list)
    missing_keywords = db.Column(db.JSON, nullable=False, default=list)
    suggestions = db.Column(db.JSON, nullable=False, default=list)
    analyzed_at = db.Column(db.DateTime, default=utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "resume_label": self.resume.label if self.resume else None,
            "score": self.score,
            "summary": self.summary,
            "strengths": self.strengths,
            "missing_keywords": self.missing_keywords,
            "suggestions": self.suggestions,
            "analyzed_at": self.analyzed_at.isoformat() if self.analyzed_at else None,
        }


class AIJob(db.Model):
    __tablename__ = "ai_jobs"

    id = db.Column(db.String(36), primary_key=True, default=new_job_id)
    kind = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="queued")
    application_id = db.Column(
        db.Integer,
        db.ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    resume_id = db.Column(
        db.Integer,
        db.ForeignKey("resumes.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    question_id = db.Column(
        db.Integer,
        db.ForeignKey("interview_questions.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    input_text = db.Column(db.Text)
    error = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=utc_now)
    started_at = db.Column(db.DateTime)
    finished_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            "id": self.id,
            "kind": self.kind,
            "status": self.status,
            "application_id": self.application_id,
            "resume_id": self.resume_id,
            "question_id": self.question_id,
            "error": self.error,
        }