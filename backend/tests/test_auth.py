from datetime import timedelta

from flask_jwt_extended import create_access_token

PASSWORD = "correct-horse-battery"


def register(client, email="new@example.com", password=PASSWORD, **extra):
    return client.post("/auth/register", json={"email": email, "password": password, **extra})


def login(client, email="new@example.com", password=PASSWORD):
    return client.post("/auth/login", json={"email": email, "password": password})


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


def test_register_returns_a_session(anon_client):
    response = register(anon_client, email="  New@Example.com ")
    assert response.status_code == 201

    session = response.get_json()
    assert session["user"]["email"] == "new@example.com"
    assert session["access_token"]
    assert session["refresh_token"]


def test_register_rejects_duplicates_and_bad_input(anon_client):
    register(anon_client)
    assert register(anon_client).status_code == 409
    assert register(anon_client, email="not-an-email").status_code == 400
    assert register(anon_client, email="short@example.com", password="short").status_code == 400


def test_invite_code_required_when_configured(app, anon_client):
    app.config["REGISTRATION_CODE"] = "letmein"
    assert anon_client.get("/auth/settings").get_json() == {"invite_required": True}
    assert register(anon_client).status_code == 403
    assert register(anon_client, invite_code="letmein").status_code == 201


def test_login_uses_one_message_for_every_failure(anon_client):
    register(anon_client)
    assert login(anon_client).status_code == 200

    wrong_password = login(anon_client, password="wrong-password")
    unknown_email = login(anon_client, email="nobody@example.com")
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.get_json()["error"] == unknown_email.get_json()["error"]


def test_protected_routes_require_a_token(anon_client):
    response = anon_client.get("/applications")
    assert response.status_code == 401
    assert response.get_json()["code"] == "auth_required"
    assert anon_client.get("/health").status_code == 200


def test_invalid_token_is_rejected(anon_client):
    response = anon_client.get("/applications", headers=bearer("not-a-real-token"))
    assert response.status_code == 401
    assert response.get_json()["code"] == "invalid_token"


def test_expired_token_reports_its_code(app, anon_client):
    with app.app_context():
        token = create_access_token(identity="1", expires_delta=timedelta(seconds=-1))
    response = anon_client.get("/applications", headers=bearer(token))
    assert response.status_code == 401
    assert response.get_json()["code"] == "token_expired"


def test_refresh_rotates_tokens(anon_client):
    first = register(anon_client).get_json()

    response = anon_client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert response.status_code == 200
    second = response.get_json()
    assert second["refresh_token"] != first["refresh_token"]

    reused = anon_client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert reused.status_code == 401


def test_logout_revokes_the_refresh_token(anon_client):
    session = register(anon_client).get_json()

    response = anon_client.post("/auth/logout", json={"refresh_token": session["refresh_token"]})
    assert response.status_code == 204

    refreshed = anon_client.post("/auth/refresh", json={"refresh_token": session["refresh_token"]})
    assert refreshed.status_code == 401


def test_me_returns_the_current_user(anon_client):
    session = register(anon_client, name="Sujal").get_json()
    response = anon_client.get("/auth/me", headers=bearer(session["access_token"]))
    assert response.get_json()["name"] == "Sujal"