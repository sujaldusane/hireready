import io

RESUME_TEXT = (
    "Sujal Dusane Software Engineer Python Flask React PostgreSQL Docker AWS "
    "Built REST APIs and CI pipelines with GitHub Actions and automated tests "
    "Developed full stack web applications and containerized services with Docker "
    "Integrated AI models into production systems and improved deployment speed"
)


def make_pdf(text):
    """Build a tiny but valid one-page PDF containing the given text."""
    content = f"BT /F1 10 Tf 40 750 Td ({text}) Tj ET".encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n"
        + content + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    pdf = bytearray(b"%PDF-1.4\n")
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
    xref_start = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for offset in offsets:
        pdf += f"{offset:010d} 00000 n \n".encode()
    pdf += (
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_start}\n%%EOF\n"
    ).encode()
    return bytes(pdf)


def upload(client, data_bytes, filename="resume.pdf", label="SWE resume"):
    return client.post(
        "/resumes",
        data={"label": label, "file": (io.BytesIO(data_bytes), filename)},
        content_type="multipart/form-data",
    )


def test_upload_resume(client):
    response = upload(client, make_pdf(RESUME_TEXT))
    assert response.status_code == 201
    data = response.get_json()
    assert data["label"] == "SWE resume"
    assert data["word_count"] > 20


def test_upload_requires_file(client):
    response = client.post("/resumes", data={}, content_type="multipart/form-data")
    assert response.status_code == 400


def test_upload_rejects_non_pdf_extension(client):
    response = upload(client, b"hello", filename="resume.docx")
    assert response.status_code == 400


def test_upload_rejects_fake_pdf(client):
    response = upload(client, b"this is not really a pdf")
    assert response.status_code == 400


def test_upload_rejects_pdf_without_enough_text(client):
    response = upload(client, make_pdf("Too short"))
    assert response.status_code == 400
    assert "scanned" in response.get_json()["error"]


def test_upload_rejects_large_files(app, client):
    app.config["MAX_CONTENT_LENGTH"] = 100
    response = upload(client, make_pdf(RESUME_TEXT))
    assert response.status_code == 413


def test_list_and_delete_resumes(client):
    resume_id = upload(client, make_pdf(RESUME_TEXT)).get_json()["id"]
    assert len(client.get("/resumes").get_json()) == 1

    assert client.delete(f"/resumes/{resume_id}").status_code == 204
    assert client.get("/resumes").get_json() == []


def test_link_resume_to_application(client):
    resume_id = upload(client, make_pdf(RESUME_TEXT)).get_json()["id"]
    app_id = client.post("/applications", json={"company": "Google", "role": "SWE"}).get_json()["id"]

    response = client.patch(f"/applications/{app_id}", json={"resume_id": resume_id})
    assert response.status_code == 200
    assert response.get_json()["resume_id"] == resume_id


def test_link_rejects_missing_resume(client):
    app_id = client.post("/applications", json={"company": "Google", "role": "SWE"}).get_json()["id"]
    response = client.patch(f"/applications/{app_id}", json={"resume_id": 999})
    assert response.status_code == 400


def test_deleting_resume_unlinks_applications(client):
    resume_id = upload(client, make_pdf(RESUME_TEXT)).get_json()["id"]
    app_id = client.post("/applications", json={"company": "Google", "role": "SWE"}).get_json()["id"]
    client.patch(f"/applications/{app_id}", json={"resume_id": resume_id})

    client.delete(f"/resumes/{resume_id}")

    application = client.get(f"/applications/{app_id}").get_json()
    assert application["resume_id"] is None