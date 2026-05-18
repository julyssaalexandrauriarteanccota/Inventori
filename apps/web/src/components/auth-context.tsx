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

import { api } from "@/lib/api";
import { clearTokens, getToken, setTokens } from "@/lib/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
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
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    api
      .get<ApiEnvelope<AuthUser>>("/auth/me")
      .then((res) => {
        setUser(res.data);
        if (res.data.mustChangePassword) {
          router.replace("/auth/cambiar-contrasena");
        }
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  useEffect(() => {
    function handleExpired() {
      setUser(null);
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
      isAuthenticated: !!user,
      login,
      logout,
      updateProfile,
      hasRole,
    }),
    [user, isLoading, login, logout, updateProfile, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
