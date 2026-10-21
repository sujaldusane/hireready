import { Route, Routes } from "react-router";
import AppShell from "./components/layout/AppShell";
import ApplicationDetailPage from "./pages/ApplicationDetailPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import DashboardPage from "./pages/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";
import ResumesPage from "./pages/ResumesPage";
import MatchTab from "./pages/application/MatchTab";
import OverviewTab from "./pages/application/OverviewTab";
import PrepTab from "./pages/application/PrepTab";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/:id" element={<ApplicationDetailPage />}>
          <Route index element={<OverviewTab />} />
          <Route path="match" element={<MatchTab />} />
          <Route path="prep" element={<PrepTab />} />
        </Route>
        <Route path="resumes" element={<ResumesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}