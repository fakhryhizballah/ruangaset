const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

async function rawRequest(path, options = {}, attachAuth = true) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (attachAuth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include', cache: 'no-store' });
  const contentType = response.headers.get('content-type') || '';
  const body = response.status === 204 ? null : contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = body && typeof body === 'object' ? body.error : `Permintaan gagal (${response.status})`;
    const error = new Error(message || 'Permintaan gagal.');
    error.status = response.status;
    throw error;
  }
  return body;
}

export async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = rawRequest('/auth/refresh', { method: 'POST' }, false)
      .then((response) => {
        setAccessToken(response?.data?.accessToken);
        return response?.data || null;
      })
      .catch(() => { setAccessToken(null); return null; })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function api(path, options = {}) {
  try {
    return await rawRequest(path, options, true);
  } catch (error) {
    if (error.status !== 401 || path.startsWith('/auth/')) throw error;
    const session = await refreshSession();
    if (!session?.accessToken) throw error;
    return rawRequest(path, options, true);
  }
}

export async function downloadXlsx(path) {
  const doDownload = async () => {
    const headers = new Headers();
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(`${API_URL}${path}`, { headers, credentials: 'include', cache: 'no-store' });
  };
  let response = await doDownload();
  if (response.status === 401) {
    const session = await refreshSession();
    if (session?.accessToken) response = await doDownload();
  }
  if (!response.ok) {
    let message = 'Gagal mengekspor laporan.';
    try { message = (await response.json()).error || message; } catch {}
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ruangaset-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
