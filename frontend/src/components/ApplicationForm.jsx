import { useState } from "react";

export default function ApplicationForm({ onAdd }) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;

    setSubmitting(true);
    const ok = await onAdd({ company: company.trim(), role: role.trim() });
    setSubmitting(false);

    if (ok) {
      setCompany("");
      setRole("");
    }
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <input
        placeholder="Company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
      />
      <input
        placeholder="Role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      <button type="submit" disabled={submitting}>
        {submitting ? "Adding..." : "Add application"}
      </button>
    </form>
  );
}