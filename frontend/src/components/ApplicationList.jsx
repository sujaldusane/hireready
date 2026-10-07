import { STATUSES } from "../constants";

export default function ApplicationList({ applications, onStatusChange, onDelete }) {
  if (applications.length === 0) {
    return <p className="empty">No applications here yet.</p>;
  }

  return (
    <ul className="app-list">
      {applications.map((app) => (
        <li key={app.id} className="app-card">
          <div>
            <h3>{app.company}</h3>
            <p>
              {app.role} · Applied {app.applied_date}
            </p>
          </div>
          <div className="actions">
            <select
              value={app.status}
              onChange={(e) => onStatusChange(app.id, e.target.value)}
              className={`status status-${app.status.toLowerCase()}`}
            >
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button className="delete" onClick={() => onDelete(app.id)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}