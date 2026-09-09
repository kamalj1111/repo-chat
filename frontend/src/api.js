const _isLocal = typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') ||
  (_isLocal ? 'http://127.0.0.1:8000' : 'https://repo-chat-backend.onrender.com');

// Log the resolved API base so it's visible in browser devtools
console.log('[api] API_BASE =', API_BASE);

async function safeFetch(url, options) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = await res.json();
        detail = body.detail || detail;
      } catch (_) {
        // ignore
      }
      throw new Error(detail);
    }
    return await res.json();
  } catch (err) {
    if (err.name === "TypeError" && (err.message.includes("fetch") || err.message.includes("Failed") || err.message.includes("NetworkError"))) {
      throw new Error(`Unable to connect to backend at ${API_BASE}. Check that the backend service is running on Render.`);
    }
    throw err;
  }
}

export async function analyzeRepo(repoUrl) {
  return safeFetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_url: repoUrl }),
  });
}

export async function getStatus(sessionId) {
  return safeFetch(`${API_BASE}/api/status/${sessionId}`);
}

export async function sendChat(sessionId, question) {
  return safeFetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, question }),
  });
}

export async function getGraph(sessionId) {
  return safeFetch(`${API_BASE}/api/graph/${sessionId}`);
}

