import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()

DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8080"


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # Check connections before use, and replace them regularly. Serverless databases
    # like Neon close idle connections, which would otherwise cause errors.
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 300}
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB upload limit

    REDIS_URL = os.getenv("REDIS_URL")
    # Without Redis, run AI jobs immediately in the same process ("eager mode").
    TASKS_EAGER = REDIS_URL is None

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=int(os.getenv("JWT_ACCESS_MINUTES", "15")))

    # If set, new accounts need this code to sign up.
    REGISTRATION_CODE = os.getenv("REGISTRATION_CODE") or None
    # Maximum AI requests (questions, matches, feedback) per user per 24 hours.
    AI_DAILY_JOB_LIMIT = int(os.getenv("AI_DAILY_JOB_LIMIT", "50"))

    # Which websites may call this API from a browser.
    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
        if origin.strip()
    ]
    # Set to true when running behind a proxy (like Render) so the real client IP is used.
    TRUST_PROXY = os.getenv("TRUST_PROXY", "false").lower() == "true"

    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URI = REDIS_URL or "memory://"
    RATELIMIT_HEADERS_ENABLED = True


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL")
    TASKS_EAGER = True
    JWT_SECRET_KEY = "test-only-secret-key-0123456789abcdef0123456789abcdef"
    REGISTRATION_CODE = None
    AI_DAILY_JOB_LIMIT = 50
    RATELIMIT_ENABLED = False