import pytest

from app import create_app, db
from config import TestConfig

TEST_PASSWORD = "correct-horse-battery"


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
    yield app
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def anon_client(app):
    """A client that isn't signed in."""
    return app.test_client()


@pytest.fixture
def make_client(app):
    """Create a client signed in as a new user with the given email."""

    def _make(email):
        test_client = app.test_client()
        response = test_client.post(
            "/auth/register",
            json={"email": email, "password": TEST_PASSWORD, "name": "Test User"},
        )
        session = response.get_json()
        test_client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {session['access_token']}"
        test_client.user_id = session["user"]["id"]
        return test_client

    return _make


@pytest.fixture
def client(make_client):
    """The default signed-in client used by most tests."""
    return make_client("test@example.com")


@pytest.fixture
def owner_id(client):
    """The id of the default signed-in user."""
    return client.user_id