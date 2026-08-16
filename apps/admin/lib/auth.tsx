'use client';

import * as React from 'react';
import { api, tokenStore } from './api';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  organizationId: string | null;
  onboardingCompleted: boolean;
}

/** Role yang BOLEH mengakses panel admin (bukan karyawan/Staff). */
export const ADMIN_ROLES = ['Admin', 'HRD', 'Manager', 'SuperAdmin'];

function decodeJwt(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      organizationId: payload.organization_id ?? null,
      onboardingCompleted: payload.onboarding_completed ?? false,
    };
  } catch {
    return null;
  }
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Tandai tur onboarding selesai (persist ke backend, sekali seumur akun). */
  completeOnboarding: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const token = tokenStore.access;
    if (token) setUser(decodeJwt(token));
    setLoading(false);
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await api<{ access_token: string; refresh_token: string }>(
      '/auth/login',
      { method: 'POST', body: { email, password }, auth: false },
    );
    const decoded = decodeJwt(res.access_token);
    if (!decoded || !ADMIN_ROLES.includes(decoded.role)) {
      throw new Error('Akun ini tidak punya akses ke panel admin');
    }
    tokenStore.set(res.access_token, res.refresh_token);
    setUser(decoded);
  }, []);

  const completeOnboarding = React.useCallback(async () => {
    await api('/auth/complete-onboarding', { method: 'POST' }).catch(() => undefined);
    // Segarkan token agar JWT membawa flag terbaru (konsisten lintas reload).
    const refresh = tokenStore.refresh;
    if (refresh) {
      try {
        const res = await api<{ access_token: string; refresh_token: string }>(
          '/auth/refresh',
          { method: 'POST', body: { refresh_token: refresh }, auth: false },
        );
        tokenStore.set(res.access_token, res.refresh_token);
        setUser(decodeJwt(res.access_token));
        return;
      } catch {
        // fallback optimistis di bawah
      }
    }
    setUser((u) => (u ? { ...u, onboardingCompleted: true } : u));
  }, []);

  const logout = React.useCallback(async () => {
    const refresh = tokenStore.refresh;
    if (refresh) {
      await api('/auth/logout', {
        method: 'POST',
        body: { refresh_token: refresh },
        auth: false,
      }).catch(() => undefined);
    }
    tokenStore.clear();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, completeOnboarding }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus di dalam AuthProvider');
  return ctx;
}
