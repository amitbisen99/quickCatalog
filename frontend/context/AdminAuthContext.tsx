import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { apiFetch, ApiError } from '@/utils/api';

export interface AdminUser {
  email: string;
}

interface AdminAuthContextValue {
  admin: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'qc_admin';

// Mirrors AuthContext.tsx but talks to /admin/auth/* and caches under a
// distinct localStorage key — entirely independent of the vendor session,
// so a browser can be logged into both at once.
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAdmin = useCallback(async () => {
    try {
      const result = await apiFetch<{ admin: AdminUser }>('/admin/auth/me');
      setAdmin(result.admin);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.admin));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setAdmin(null);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        setAdmin(JSON.parse(cached));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);

    if (cached) {
      refreshAdmin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    const result = await apiFetch<{ admin: AdminUser }>('/admin/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setAdmin(result.admin);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result.admin));
  }

  async function logout() {
    try {
      await apiFetch('/admin/auth/logout', { method: 'POST' });
    } finally {
      setAdmin(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
