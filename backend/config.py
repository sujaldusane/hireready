import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5 MB upload limit

    REDIS_URL = os.getenv("REDIS_URL")
    # Without Redis, run AI jobs immediately in the same process ("eager mode").
    TASKS_EAGER = REDIS_URL is None


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.getenv("TEST_DATABASE_URL")
    TASKS_EAGER = True