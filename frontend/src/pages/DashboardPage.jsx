import { Link } from "react-router";
import StatsBar from "../components/StatsBar";
import useData from "../hooks/useData";

export default function DashboardPage() {
  const { applications } = useData();

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Where your search stands right now.</p>
        </div>
      </header>
      <StatsBar applications={applications} />
      <Link to="/applications">See all applications</Link>
    </div>
  );
}