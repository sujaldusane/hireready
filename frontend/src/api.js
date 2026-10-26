const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
const REFRESH_TOKEN_KEY = "hireready.refreshToken";

// ---------- Session ----------

let accessToken = null; // kept only in memory, never in storage
let refreshPromise = null;
let handleAuthFailure = () => {};

export function setAuthFailureHandler(handler) {
  handleAuthFailure = handler;
}

export function getStoredRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveSession(session) {
  accessToken = session.access_token;
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
  } catch {
    // Storage unavailable (e.g. private mode); the session lasts until the tab closes.
  }
}

export function clearSession() {
  accessToken = null;
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Storage unavailable
  }
}

// ---------- Requests ----------

async function send(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  let data = null;
  if (response.status !== 204) {
    try {
      data = await response.json();
    } catch {
      // Response wasn't JSON (e.g. a proxy error page)
    }
  }
  return { response, data };
}

function toError(response, data) {
  const error = new Error(data?.error || `Request failed (${response.status})`);
  error.status = response.status;
  error.code = data?.code;
  return error;
}

// Exchanges the refresh token for a new session. Concurrent callers share one request.
export function refreshSession() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return Promise.reject(new Error("Not signed in"));

  if (!refreshPromise) {
    refreshPromise = send("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(({ response, data }) => {
        if (!response.ok) {
          clearSession();
          throw toError(response, data);
        }
        saveSession(data);
        return data.user;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Sends an authenticated request, refreshing the session once if the access token expired.
async function request(path, options = {}) {
  let { response, data } = await send(path, options);

  if (response.status === 401 && getStoredRefreshToken()) {
    try {
      await refreshSession();
    } catch {
      handleAuthFailure();
      throw toError(response, data);
    }
    ({ response, data } = await send(path, options));
  }

  if (response.status === 401) handleAuthFailure();
  if (!response.ok) throw toError(response, data);
  return data;
}

// ---------- Accounts ----------

async function startSession(path, body) {
  const { response, data } = await send(path, { method: "POST", body: JSON.stringify(body) });
  if (!response.ok) throw toError(response, data);
  saveSession(data);
  return data.user;
}

export const login = (email, password) => startSession("/auth/login", { email, password });

export const register = (details) => startSession("/auth/register", details);

export async function logout() {
  const refreshToken = getStoredRefreshToken();
  clearSession();
  if (refreshToken) {
    try {
      await send("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // The local session is already cleared, so a failed request is fine.
    }
  }
}

export async function getAuthSettings() {
  const { response, data } = await send("/auth/settings");
  if (!response.ok) throw toError(response, data);
  return data;
}

// ---------- Applications ----------

export const getApplications = () => request("/applications");

export const createApplication = (application) =>
  request("/applications", { method: "POST", body: JSON.stringify(application) });

export const updateApplication = (id, changes) =>
  request(`/applications/${id}`, { method: "PATCH", body: JSON.stringify(changes) });

export const deleteApplication = (id) =>
  request(`/applications/${id}`, { method: "DELETE" });

// ---------- Interview questions ----------

export const getQuestions = (id) => request(`/applications/${id}/questions`);

export const generateQuestions = (id) =>
  request(`/applications/${id}/questions`, { method: "POST" });

// ---------- Resumes ----------

export const getResumes = () => request("/resumes");

export const uploadResume = (label, file) => {
  const body = new FormData();
  body.append("label", label);
  body.append("file", file);
  return request("/resumes", { method: "POST", body });
};

export const deleteResume = (id) => request(`/resumes/${id}`, { method: "DELETE" });

// ---------- Resume match ----------

export const getMatches = (id) => request(`/applications/${id}/matches`);

export const analyzeMatch = (id, resumeId) =>
  request(`/applications/${id}/match`, {
    method: "POST",
    body: JSON.stringify(resumeId ? { resume_id: resumeId } : {}),
  });

// ---------- Practice answers ----------

export const getAnswers = (questionId) => request(`/questions/${questionId}/answers`);

export const submitAnswer = (questionId, answer) =>
  request(`/questions/${questionId}/answers`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });

// ---------- AI jobs ----------

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

// ---------- Insights ----------

export const getInsights = () => request("/insights");