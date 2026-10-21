import { useState } from "react";
import { useNavigate } from "react-router";
import { STATUSES } from "../constants";
import useData from "../hooks/useData";
import Modal from "./ui/Modal";

const EMPTY_FORM = {
  company: "",
  role: "",
  status: "Applied",
  resume_id: "",
  job_description: "",
};

export default function AddApplicationDialog({ onClose }) {
  const navigate = useNavigate();
  const { resumes, addApplication, updateApplication } = useData();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const created = await addApplication({
      company: form.company.trim(),
      role: form.role.trim(),
      status: form.status,
      job_description: form.job_description.trim() || null,
    });

    if (created && form.resume_id) {
      await updateApplication(created.id, { resume_id: Number(form.resume_id) });
    }

    setSaving(false);
    if (created) {
      onClose();
      navigate(`/applications/${created.id}`);
    }
  }

  return (
    <Modal title="Add application" onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field-row">
          <label className="field">
            <span>Company</span>
            <input data-autofocus required value={form.company} onChange={update("company")} />
          </label>
          <label className="field">
            <span>Role</span>
            <input required value={form.role} onChange={update("role")} />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Status</span>
            <select value={form.status} onChange={update("status")}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Resume</span>
            <select value={form.resume_id} onChange={update("resume_id")}>
              <option value="">None yet</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>
            Job description <em className="optional">optional</em>
          </span>
          <textarea
            rows={6}
            value={form.job_description}
            onChange={update("job_description")}
            placeholder="Paste the posting here. You'll need it for match scores and interview questions."
          />
        </label>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={saving}>
            {saving ? "Adding..." : "Add application"}
          </button>
        </div>
      </form>
    </Modal>
  );
}