import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

const MAX_BYTES = 5 * 1024 * 1024;

function validate(file) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Choose a PDF file. Export your resume from Word or Google Docs as a PDF first.";
  if (file.size > MAX_BYTES) return "This file is over 5 MB. Try exporting it again with smaller images.";
  return "";
}

function labelFromFilename(name) {
  return name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim();
}

export default function ResumeUpload({ onUpload }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  function choose(nextFile) {
    if (!nextFile) return;
    const problem = validate(nextFile);
    setError(problem);
    if (problem) {
      setFile(null);
      return;
    }
    setFile(nextFile);
    if (!label.trim()) setLabel(labelFromFilename(nextFile.name));
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    choose(e.dataTransfer.files[0]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    const created = await onUpload(label.trim(), file);
    setUploading(false);

    if (created) {
      setFile(null);
      setLabel("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <form className="surface upload-panel" onSubmit={handleSubmit}>
      <label
        className={`dropzone${dragging ? " is-dragging" : ""}${file ? " has-file" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="visually-hidden"
          onChange={(e) => choose(e.target.files[0])}
        />
        <UploadCloud size={22} aria-hidden="true" />
        {file ? (
          <>
            <strong>{file.name}</strong>
            <span className="hint">Choose a different file</span>
          </>
        ) : (
          <>
            <strong>Drop a PDF here, or choose a file</strong>
            <span className="hint">A PDF with selectable text, up to 5 MB</span>
          </>
        )}
      </label>

      {error && <p className="error">{error}</p>}

      {file && (
        <div className="upload-row">
          <label className="field">
            <span>Label</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="For example, Backend resume v2"
              maxLength={120}
            />
          </label>
          <button type="submit" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload resume"}
          </button>
        </div>
      )}
    </form>
  );
}