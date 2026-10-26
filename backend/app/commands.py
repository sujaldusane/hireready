import click

from app import db
from app.models import Application, Resume, User


def register_commands(app):
    @app.cli.command("claim-data")
    @click.argument("email")
    def claim_data(email):
        """Assign applications and resumes that have no owner to this user."""
        user = User.query.filter_by(email=email.strip().lower()).first()
        if user is None:
            raise click.ClickException(f"No account found for {email}. Sign up first.")

        applications = Application.query.filter(Application.user_id.is_(None)).update(
            {"user_id": user.id}
        )
        resumes = Resume.query.filter(Resume.user_id.is_(None)).update({"user_id": user.id})
        db.session.commit()

        click.echo(f"Assigned {applications} applications and {resumes} resumes to {user.email}.")