def create(client, **overrides):
    payload = {"company": "Google", "role": "SWE Intern", **overrides}
    return client.post("/applications", json=payload)


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_create_application(client):
    response = create(client)
    assert response.status_code == 201
    data = response.get_json()
    assert data["company"] == "Google"
    assert data["status"] == "Applied"


def test_create_requires_company_and_role(client):
    response = client.post("/applications", json={"company": "Meta"})
    assert response.status_code == 400


def test_create_rejects_invalid_status(client):
    response = create(client, status="Ghosted")
    assert response.status_code == 400


def test_list_applications(client):
    create(client, company="Google")
    create(client, company="Amazon")
    response = client.get("/applications")
    assert response.status_code == 200
    assert len(response.get_json()) == 2


def test_get_missing_application_returns_404(client):
    response = client.get("/applications/999")
    assert response.status_code == 404


def test_update_status(client):
    app_id = create(client).get_json()["id"]
    response = client.patch(f"/applications/{app_id}", json={"status": "Interview"})
    assert response.status_code == 200
    assert response.get_json()["status"] == "Interview"


def test_update_rejects_invalid_status(client):
    app_id = create(client).get_json()["id"]
    response = client.patch(f"/applications/{app_id}", json={"status": "Ghosted"})
    assert response.status_code == 400


def test_delete_application(client):
    app_id = create(client).get_json()["id"]
    response = client.delete(f"/applications/{app_id}")
    assert response.status_code == 204
    assert client.get(f"/applications/{app_id}").status_code == 404