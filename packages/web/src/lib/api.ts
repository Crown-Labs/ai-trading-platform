/**
 * Base API URL — uses VITE_API_URL env var if set (Docker),
 * otherwise falls back to localhost:4000 (local dev).
 * When running behind nginx proxy in Docker, use '/api' prefix via proxy.
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
