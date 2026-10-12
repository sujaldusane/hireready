import { useEffect, useState } from "react";
import {
  createApplication,
  deleteApplication,
  deleteResume,
  getApplications,
  getResumes,
  updateApplication,
  uploadResume,
} from "./api";
import { STATUSES } from "./constants";
import ApplicationForm from "./components/ApplicationForm";
import ApplicationList from "./components/ApplicationList";
import ResumeManager from "./components/ResumeManager";
import StatsBar from "./components/StatsBar";

export default function App() {
  const [applications, setApplications] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getApplications(), getResumes()])
      .then(([apps, resumeList]) => {
        setApplications(apps);
        setResumes(resumeList);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function run(action) {
    setError("");
    try {
      await action();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }

  const handleAdd = (newApplication) =>
    run(async () => {
      const created = await createApplication(newApplication);
      setApplications((prev) => [created, ...prev]);
    });

  const handleUpdate = (id, changes) =>
    run(async () => {
      const updated = await updateApplication(id, changes);
      setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    });

  const handleDelete = (id) =>
    run(async () => {
      await deleteApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
    });

  const handleUploadResume = (label, file) =>
    run(async () => {
      const created = await uploadResume(label, file);
      setResumes((prev) => [created, ...prev]);
    });

  const handleDeleteResume = (id) =>
    run(async () => {
      await deleteResume(id);
      setResumes((prev) => prev.filter((r) => r.id !== id));
      setApplications((prev) =>
        prev.map((a) => (a.resume_id === id ? { ...a, resume_id: null } : a))
      );
    });

  const visible =
    filter === "All" ? applications : applications.filter((a) => a.status === filter);

  return (
    <main className="container">
      <header>
        <h1>HireReady</h1>
        <p>Track your applications and prepare for every interview</p>
      </header>

      {error && <p className="error">{error}</p>}

      <StatsBar applications={applications} />
      <ResumeManager
        resumes={resumes}
        onUpload={handleUploadResume}
        onDelete={handleDeleteResume}
      />
      <ApplicationForm onAdd={handleAdd} />

      <div className="filters">
        {["All", ...STATUSES].map((s) => (
          <button
            key={s}
            className={filter === s ? "active" : ""}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="empty">Loading...</p>
      ) : (
        <ApplicationList
          applications={visible}
          resumes={resumes}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}