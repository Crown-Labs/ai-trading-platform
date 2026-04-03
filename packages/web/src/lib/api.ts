/**
 * Base API URL — uses VITE_API_URL env var if set (Docker),
 * otherwise falls back to localhost:4000 (local dev).
 * When running behind nginx proxy in Docker, use '/api' prefix via proxy.
 */
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const TOKEN_KEY = 'ai-trading-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Authenticated fetch wrapper — auto-injects Bearer token and handles JSON.
 */
export async function apiFetch<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(init.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${body}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : (undefined as T);
}

/**
 * Authenticated fetch that returns the raw Response (for SSE streams, etc.).
 */
export async function apiFetchRaw(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(init.headers as Record<string, string>),
  };

  return fetch(`${API_BASE}${path}`, { ...init, headers });
}
