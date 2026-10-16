const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: isFormData ? {} : { "Content-Type": "application/json" },
  });

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Response wasn't JSON (e.g. a proxy error page)
  }

  if (!response.ok) throw new Error(data?.error || `Request failed (${response.status})`);
  return data;
}
export const getApplications = () => request("/applications");

export const createApplication = (application) =>
  request("/applications", { method: "POST", body: JSON.stringify(application) });

export const updateApplication = (id, changes) =>
  request(`/applications/${id}`, { method: "PATCH", body: JSON.stringify(changes) });

export const deleteApplication = (id) =>
  request(`/applications/${id}`, { method: "DELETE" });

export const getQuestions = (id) => request(`/applications/${id}/questions`);

export const generateQuestions = (id) =>
  request(`/applications/${id}/questions`, { method: "POST" });

export const getResumes = () => request("/resumes");

export const uploadResume = (label, file) => {
  const body = new FormData();
  body.append("label", label);
  body.append("file", file);
  return request("/resumes", { method: "POST", body });
};

export const deleteResume = (id) => request(`/resumes/${id}`, { method: "DELETE" });

export const getMatches = (id) => request(`/applications/${id}/matches`);

export const analyzeMatch = (id, resumeId) =>
  request(`/applications/${id}/match`, {
    method: "POST",
    body: JSON.stringify(resumeId ? { resume_id: resumeId } : {}),
  });
  export const getJob = (id) => request(`/jobs/${id}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function waitForJob(job, { interval = 1500, timeout = 90000 } = {}) {
  const startedAt = Date.now();
  let current = job;

  while (current.status === "queued" || current.status === "running") {
    if (Date.now() - startedAt > timeout) {
      throw new Error("This is taking longer than expected. Please check back in a minute.");
    }
    await sleep(interval);
    current = await getJob(current.id);
  }

  if (current.status === "failed") {
    throw new Error(current.error || "The AI task failed. Please try again.");
  }
  return current;
}