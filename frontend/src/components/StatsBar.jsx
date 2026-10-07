import { STATUSES } from "../constants";

export default function StatsBar({ applications }) {
  const total = applications.length;
  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, applications.filter((a) => a.status === s).length])
  );
  const interviewRate = total
    ? Math.round(((counts.Interview + counts.Offer) / total) * 100)
    : 0;

  return (
    <section className="stats">
      <div className="stat">
        <span>{total}</span>Total
      </div>
      {STATUSES.map((s) => (
        <div key={s} className="stat">
          <span>{counts[s]}</span>
          {s}
        </div>
      ))}
      <div className="stat">
        <span>{interviewRate}%</span>Interview rate
      </div>
    </section>
  );
}