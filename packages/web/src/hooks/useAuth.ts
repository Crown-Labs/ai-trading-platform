import { useState, useEffect, useCallback } from 'react';
import { API_BASE, getToken, setToken, clearToken } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate existing token on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setUser(data);
        else clearToken();
      })
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (googleCredential: string) => {
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: googleCredential }),
    });

    if (!res.ok) {
      throw new Error('Login failed');
    }

    const data = await res.json();
    setToken(data.accessToken);
    setUser(data.user);

    return data.user;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return { user, isLoading, login, logout };
}
