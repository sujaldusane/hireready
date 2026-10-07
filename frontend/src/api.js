const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (response.status === 204) return null;

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const getApplications = () => request("/applications");

export const createApplication = (application) =>
  request("/applications", { method: "POST", body: JSON.stringify(application) });

export const updateApplication = (id, changes) =>
  request(`/applications/${id}`, { method: "PATCH", body: JSON.stringify(changes) });

export const deleteApplication = (id) =>
  request(`/applications/${id}`, { method: "DELETE" });