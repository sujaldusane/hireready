from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData

from config import Config

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

db = SQLAlchemy(metadata=MetaData(naming_convention=NAMING_CONVENTION))
migrate = Migrate()
jwt = JWTManager()


@jwt.unauthorized_loader
def missing_token(reason):
    return jsonify({"error": "Sign in to continue.", "code": "auth_required"}), 401


@jwt.invalid_token_loader
def invalid_token(reason):
    return jsonify(
        {"error": "Your session isn't valid. Please sign in again.", "code": "invalid_token"}
    ), 401


@jwt.expired_token_loader
def expired_token(jwt_header, jwt_payload):
    return jsonify({"error": "Your session expired.", "code": "token_expired"}), 401


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    if not app.config.get("JWT_SECRET_KEY"):
        raise RuntimeError("JWT_SECRET_KEY is not set. Add it to your .env file.")

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app)

    from app import models  # noqa: F401  (registers models with SQLAlchemy)
    from app.auth import auth_bp
    from app.commands import register_commands
    from app.routes import bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(bp)
    register_commands(app)

    return app