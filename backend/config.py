import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
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


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL")
    TASKS_EAGER = True
    JWT_SECRET_KEY = "test-only-secret-key-0123456789abcdef0123456789abcdef"
    REGISTRATION_CODE = None
    AI_DAILY_JOB_LIMIT = 50