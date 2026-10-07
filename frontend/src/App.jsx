import { useEffect, useState } from "react";
import {
  getApplications,
  createApplication,
  updateApplication,
  deleteApplication,
} from "./api";
import { STATUSES } from "./constants";
import ApplicationForm from "./components/ApplicationForm";
import ApplicationList from "./components/ApplicationList";
import StatsBar from "./components/StatsBar";

export default function App() {
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApplications()
      .then(setApplications)
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

  const handleStatusChange = (id, status) =>
    run(async () => {
      const updated = await updateApplication(id, { status });
      setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
    });

  const handleDelete = (id) =>
    run(async () => {
      await deleteApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
    });

  const visible =
    filter === "All" ? applications : applications.filter((a) => a.status === filter);

  return (
    <main className="container">
      <header>
        <h1>HireReady</h1>
        <p>Track your job applications</p>
      </header>

      {error && <p className="error">{error}</p>}

      <StatsBar applications={applications} />
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
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}
    </main>
  );
}