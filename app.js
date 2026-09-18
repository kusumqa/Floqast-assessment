/**
 * Shared frontend helpers - a thin API client and localStorage-backed
 * "session" (userId + apiToken issued at registration). Not a framework;
 * intentionally plain vanilla JS so the UI test suite exercises real DOM
 * behavior without a build step.
 */
const SESSION_KEY = 'fintech_mock_session';

function gatewayUrl(path) {
  const base = (window.APP_CONFIG && window.APP_CONFIG.gatewayBaseUrl) || 'http://localhost:4000';
  return `${base}${path}`;
}

async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const resp = await fetch(gatewayUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await resp.json();
  } catch (_e) {
    data = null;
  }
  return { ok: resp.ok, status: resp.status, data };
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** Extracts a flat list of "field: message" strings from a gateway validation error body. */
function flattenErrorMessage(data) {
  if (!data || !data.error) return 'Something went wrong. Please try again.';
  const { message, details } = data.error;
  if (details && typeof details === 'object') {
    const lines = Object.entries(details).map(([field, msg]) => `${field}: ${msg}`);
    return [message, ...lines].join(' — ');
  }
  return message;
}

function renderSessionBar(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const session = getSession();
  if (!session) {
    el.innerHTML = '<span>Not signed in</span> <a href="register.html">Register</a>';
    return;
  }
  el.innerHTML = `<span data-testid="session-user">Signed in as <strong>${session.name}</strong> (${session.accountType})</span>`;
  const btn = document.createElement('button');
  btn.textContent = 'Sign out';
  btn.setAttribute('data-testid', 'sign-out-button');
  btn.addEventListener('click', () => {
    clearSession();
    window.location.href = 'index.html';
  });
  el.appendChild(btn);
}
