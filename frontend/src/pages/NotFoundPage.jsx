import { Link } from "react-router";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Page not found");

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