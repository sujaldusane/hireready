import pytest

from app import create_app, db
from config import TestConfig


class RateLimitedConfig(TestConfig):
    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URI = "memory://"


@pytest.fixture
def limited_client():
    app = create_app(RateLimitedConfig)
    with app.app_context():
        db.create_all()
    yield app.test_client()
    with app.app_context():
        db.session.remove()
        db.drop_all()


def test_login_is_rate_limited(limited_client):
    attempt = {"email": "someone@example.com", "password": "wrong-password"}

    statuses = [limited_client.post("/auth/login", json=attempt).status_code for _ in range(10)]
    assert statuses == [401] * 10

    blocked = limited_client.post("/auth/login", json=attempt)
    assert blocked.status_code == 429
    assert blocked.get_json()["code"] == "rate_limited"