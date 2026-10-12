import { useRef, useState } from "react";

export default function ResumeManager({ resumes, onUpload, onDelete }) {
  const formRef = useRef(null);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const ok = await onUpload(label.trim(), file);
    setUploading(false);

    if (ok) {
      formRef.current.reset();
      setLabel("");
      setFile(null);
    }
  }

  return (
    <section className="panel">
      <h2>Your resumes</h2>

      {resumes.length > 0 ? (
        <ul className="resume-list">
          {resumes.map((r) => (
            <li key={r.id}>
              <span>
                <strong>{r.label}</strong> · {r.word_count} words
              </span>
              <button className="link-button" onClick={() => onDelete(r.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">Upload a PDF resume to link it to applications.</p>
      )}

      <form ref={formRef} className="upload-form" onSubmit={handleSubmit}>
        <input
          placeholder="Label, e.g. Backend resume v2"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files[0] || null)}
        />
        <button type="submit" disabled={!file || uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </section>
  );
}