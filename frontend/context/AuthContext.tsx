import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { apiFetch, ApiError } from '@/utils/api';

export interface AuthUser {
  id: string;
  email: string;
  mobileNo?: string;
  countryCode?: string;
  businessName?: string;
  businessType?: string;
  industry?: string;
  logo?: string;
  banner?: string;
  currency?: string;
  subscriptionType?: string;
  subscriptionExpiresAt?: string;
  subdomain?: string;
  subdomainStatus?: 'pending' | 'active' | 'failed';
  customDomain?: string;
  customDomainStatus?: 'pending' | 'active' | 'failed';
  primaryCatalogId?: string;
  status?: string;
  createdAt?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'qc_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const result = await apiFetch<{ user: AuthUser }>('/users/profile');
      setUser(result.user);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY);
      }
      // Any other error (network blip, etc.) — keep whatever we already
      // have cached rather than booting the user out.
    }
  }, []);

  useEffect(() => {
    // Cached value shows something immediately (no flash of "logged
    // out"); the profile call right after confirms it's still valid and
    // brings it up to date.
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);

    if (cached) {
      refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string, rememberMe: boolean) {
    const result = await apiFetch<{ user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: { email, password, rememberMe },
    });
    setUser(result.user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result.user));
  }

  async function logout() {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
