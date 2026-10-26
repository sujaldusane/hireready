import hashlib
import re
import secrets
from datetime import timedelta

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash, generate_password_hash

from app import db
from app.models import RefreshToken, User, utc_now

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128
REFRESH_TOKEN_LIFETIME = timedelta(days=30)
INVALID_LOGIN = "Email or password is incorrect."
SESSION_EXPIRED = "Your session has expired. Please sign in again."

# Used so that logging in with an unknown email takes as long as a wrong password.
DUMMY_PASSWORD_HASH = generate_password_hash("not-a-real-password")


def hash_token(raw_token):
    return hashlib.sha256(raw_token.encode()).hexdigest()


def issue_session(user):
    """Create a new access token and refresh token for this user."""
    raw_refresh_token = secrets.token_urlsafe(48)
    db.session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(raw_refresh_token),
            expires_at=utc_now() + REFRESH_TOKEN_LIFETIME,
        )
    )
    db.session.commit()
    return {
        "access_token": create_access_token(identity=str(user.id)),
        "refresh_token": raw_refresh_token,
        "user": user.to_dict(),
    }


def read_credentials():
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    password = data.get("password")
    email = email.strip().lower() if isinstance(email, str) else ""
    password = password if isinstance(password, str) else ""
    return data, email, password


@auth_bp.get("/settings")
def settings():
    return jsonify({"invite_required": bool(current_app.config.get("REGISTRATION_CODE"))})


@auth_bp.post("/register")
def register():
    data, email, password = read_credentials()

    required_code = current_app.config.get("REGISTRATION_CODE")
    if required_code:
        given_code = str(data.get("invite_code") or "")
        if not secrets.compare_digest(given_code.encode(), required_code.encode()):
            return jsonify({"error": "That invite code isn't valid."}), 403

    if len(email) > 255 or not EMAIL_PATTERN.match(email):
        return jsonify({"error": "Enter a valid email address."}), 400
    if not MIN_PASSWORD_LENGTH <= len(password) <= MAX_PASSWORD_LENGTH:
        return jsonify(
            {"error": f"Passwords must be {MIN_PASSWORD_LENGTH} to {MAX_PASSWORD_LENGTH} characters."}
        ), 400

    name = str(data.get("name") or "").strip()[:120] or None
    user = User(email=email, name=name)
    user.set_password(password)
    db.session.add(user)

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "An account with this email already exists."}), 409

    return jsonify(issue_session(user)), 201


@auth_bp.post("/login")
def login():
    _, email, password = read_credentials()
    user = User.query.filter_by(email=email).first() if email else None

    if user is None:
        check_password_hash(DUMMY_PASSWORD_HASH, password)
        return jsonify({"error": INVALID_LOGIN}), 401
    if not user.check_password(password):
        return jsonify({"error": INVALID_LOGIN}), 401

    return jsonify(issue_session(user))


@auth_bp.post("/refresh")
def refresh():
    data = request.get_json(silent=True) or {}
    raw_token = data.get("refresh_token")
    if not isinstance(raw_token, str) or not raw_token:
        return jsonify({"error": SESSION_EXPIRED, "code": "session_expired"}), 401

    token = RefreshToken.query.filter_by(token_hash=hash_token(raw_token)).first()
    if token is None or token.expires_at <= utc_now():
        if token is not None:
            db.session.delete(token)
            db.session.commit()
        return jsonify({"error": SESSION_EXPIRED, "code": "session_expired"}), 401

    user = token.user
    db.session.delete(token)  # rotation: each refresh token works only once
    return jsonify(issue_session(user))


@auth_bp.post("/logout")
def logout():
    data = request.get_json(silent=True) or {}
    raw_token = data.get("refresh_token")
    if isinstance(raw_token, str) and raw_token:
        RefreshToken.query.filter_by(token_hash=hash_token(raw_token)).delete()
        db.session.commit()
    return "", 204


@auth_bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if user is None:
        return jsonify({"error": SESSION_EXPIRED, "code": "session_expired"}), 401
    return jsonify(user.to_dict())