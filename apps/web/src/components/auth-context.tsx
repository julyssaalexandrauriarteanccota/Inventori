"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type {
  AuthResponse,
  AuthUser,
  RolUsuario,
  UpdateOwnProfilePayload,
} from "@erp/shared";

import { api, isApiConnectionError } from "@/lib/api";
import { clearTokens, getToken, setTokens } from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  authError: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retryAuth: () => Promise<void>;
  updateProfile: (data: UpdateOwnProfilePayload) => Promise<AuthUser>;
  hasRole: (...roles: RolUsuario[]) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface ApiEnvelope<T> {
  data: T;
  meta: { timestamp: string };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setAuthError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.get<ApiEnvelope<AuthUser>>("/auth/me");
      setUser(res.data);
      setAuthError(null);
      if (res.data.mustChangePassword) {
        router.replace("/auth/cambiar-contrasena");
      }
    } catch (error) {
      if (isApiConnectionError(error)) {
        setAuthError(error.message);
        return;
      }

      setAuthError(null);
      setUser(null);
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const retryAuth = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  useEffect(() => {
    function handleExpired() {
      setUser(null);
      setAuthError(null);
      clearTokens();
      router.replace("/auth/login");
    }

    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, [router]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<ApiEnvelope<AuthResponse>>(
        "/auth/login",
        { email, password },
        { skipAuth: true },
      );

      const data = res.data;
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      setAuthError(null);

      if (data.user.mustChangePassword) {
        router.replace("/auth/cambiar-contrasena");
      } else {
        router.replace("/dashboard");
      }
    },
    [router],
  );

  const logout = useCallback(async () => {
    try {
      const { getRefreshToken } = await import("@/lib/auth");
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await api.post("/auth/logout", { refreshToken }).catch(() => {});
      }
    } catch {
      // Ignorar fallas remotas: siempre limpiamos el estado local.
    } finally {
      clearTokens();
      setUser(null);
      router.replace("/auth/login");
    }
  }, [router]);

  const updateProfile = useCallback(async (data: UpdateOwnProfilePayload) => {
    const res = await api.patch<ApiEnvelope<AuthUser>>("/auth/me", data);
    setUser(res.data);
    return res.data;
  }, []);

  const hasRole = useCallback(
    (...roles: RolUsuario[]) => {
      if (!user) return false;
      return roles.includes(user.rol);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      authError,
      isAuthenticated: !!user,
      login,
      logout,
      retryAuth,
      updateProfile,
      hasRole,
    }),
    [user, isLoading, authError, login, logout, retryAuth, updateProfile, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
