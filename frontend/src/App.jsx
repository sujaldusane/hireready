import { Route, Routes } from "react-router";
import RequireAuth from "./components/RequireAuth";
import AppShell from "./components/layout/AppShell";
import DataProvider from "./context/DataProvider";
import ApplicationDetailPage from "./pages/ApplicationDetailPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import RegisterPage from "./pages/RegisterPage";
import ResumesPage from "./pages/ResumesPage";
import MatchTab from "./pages/application/MatchTab";
import OverviewTab from "./pages/application/OverviewTab";
import PrepTab from "./pages/application/PrepTab";

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />

      <Route
        element={
          <RequireAuth>
            <DataProvider>
              <AppShell />
            </DataProvider>
          </RequireAuth>
        }
      >
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