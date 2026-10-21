import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className="page">
      <div className="empty-state">
        <h2>Page not found</h2>
        <p>The page you're looking for doesn't exist.</p>
        <Link to="/">Go to the dashboard</Link>
      </div>
    </div>
  );
}