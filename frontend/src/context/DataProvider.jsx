import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "../api";
import useToast from "../hooks/useToast";
import { DataContext } from "./contexts";

export default function DataProvider({ children }) {
  const { showToast } = useToast();
  const [applications, setApplications] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    Promise.all([api.getApplications(), api.getResumes()])
      .then(([apps, resumeList]) => {
        setApplications(apps);
        setResumes(resumeList);
      })
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Runs an action, shows a toast, and returns the result (or null on failure).
  const run = useCallback(
    async (action, successMessage) => {
      try {
        const result = await action();
        if (successMessage) showToast(successMessage);
        return result ?? true;
      } catch (err) {
        showToast(err.message, "error");
        return null;
      }
    },
    [showToast]
  );

  const addApplication = useCallback(
    (data) =>
      run(async () => {
        const created = await api.createApplication(data);
        setApplications((prev) => [created, ...prev]);
        return created;
      }, "Application added"),
    [run]
  );

  const updateApplication = useCallback(
    (id, changes) =>
      run(async () => {
        const updated = await api.updateApplication(id, changes);
        setApplications((prev) => prev.map((a) => (a.id === id ? updated : a)));
        return updated;
      }),
    [run]
  );

  const deleteApplication = useCallback(
    (id) =>
      run(async () => {
        await api.deleteApplication(id);
        setApplications((prev) => prev.filter((a) => a.id !== id));
      }, "Application deleted"),
    [run]
  );

  const uploadResume = useCallback(
    (label, file) =>
      run(async () => {
        const created = await api.uploadResume(label, file);
        setResumes((prev) => [created, ...prev]);
        return created;
      }, "Resume uploaded"),
    [run]
  );

  const deleteResume = useCallback(
    (id) =>
      run(async () => {
        await api.deleteResume(id);
        setResumes((prev) => prev.filter((r) => r.id !== id));
        setApplications((prev) =>
          prev.map((a) => (a.resume_id === id ? { ...a, resume_id: null } : a))
        );
      }, "Resume removed"),
    [run]
  );

  const value = useMemo(
    () => ({
      applications,
      resumes,
      loading,
      loadError,
      addApplication,
      updateApplication,
      deleteApplication,
      uploadResume,
      deleteResume,
    }),
    [
      applications,
      resumes,
      loading,
      loadError,
      addApplication,
      updateApplication,
      deleteApplication,
      uploadResume,
      deleteResume,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}