from datetime import date, timedelta


def create(client, **overrides):
    payload = {"company": "Google", "role": "SWE", **overrides}
    return client.post("/applications", json=payload)


def test_create_defaults_to_today(client):
    data = create(client).get_json()
    assert data["applied_date"] == date.today().isoformat()


def test_create_with_past_date(client):
    past = (date.today() - timedelta(days=10)).isoformat()
    response = create(client, applied_date=past)
    assert response.status_code == 201
    assert response.get_json()["applied_date"] == past


def test_rejects_future_and_invalid_dates(client):
    future = (date.today() + timedelta(days=1)).isoformat()
    assert create(client, applied_date=future).status_code == 400
    assert create(client, applied_date="next tuesday").status_code == 400


def test_update_applied_date(client):
    app_id = create(client).get_json()["id"]
    past = (date.today() - timedelta(days=3)).isoformat()

    response = client.patch(f"/applications/{app_id}", json={"applied_date": past})
    assert response.status_code == 200
    assert response.get_json()["applied_date"] == past

    bad = client.patch(f"/applications/{app_id}", json={"applied_date": "2026-13-45"})
    assert bad.status_code == 400