const BASE = '/api';

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('ms_token');
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });

    if (res.status === 401) {
      localStorage.removeItem('ms_token');
      localStorage.removeItem('ms_user');
      window.dispatchEvent(new Event('ms_logout'));
      return { error: 'Session expired. Please log in again.' };
    }

    // Try to parse JSON — if response is not JSON (e.g. HTML 502 error page), handle gracefully
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error(`[API] Non-JSON response for ${path}:`, text.slice(0, 200));
      return { error: `Server error (${res.status}). Make sure the backend is running on port 5000.` };
    }

  } catch (err) {
    // fetch() itself threw — backend is unreachable
    console.error(`[API] Network error for ${path}:`, err.message);
    return { error: 'Cannot reach backend. Make sure the backend server is running (npm run dev in /backend).' };
  }
}

export const api = {
  get:    (path)       => apiFetch(path),
  post:   (path, body) => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (path, body) => apiFetch(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (path)       => apiFetch(path, { method: 'DELETE' }),
};
