from datetime import date, datetime, timezone
from app import db

class Application(db.Model):
    __tablename__ = "applications"

    id = db.Column(db.Integer, primary_key=True)
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
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    questions = db.relationship(
        "InterviewQuestion",
        backref="application",
        cascade="all, delete-orphan",
        order_by="InterviewQuestion.id",
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
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "application_id": self.application_id,
            "category": self.category,
            "question": self.question,
        }


class Resume(db.Model):
    __tablename__ = "resumes"

    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String(120), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    applications = db.relationship("Application", backref="resume")

    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label,
            "filename": self.filename,
            "word_count": len(self.text.split()),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }