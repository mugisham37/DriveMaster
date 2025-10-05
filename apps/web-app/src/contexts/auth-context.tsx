"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { authApi } from "@/lib/api/auth";

interface AuthContextType {
  // Re-export store state and actions for convenience
  user: ReturnType<typeof useAuthStore>["user"];
  isAuthenticated: ReturnType<typeof useAuthStore>["isAuthenticated"];
  isLoading: ReturnType<typeof useAuthStore>["isLoading"];
  error: ReturnType<typeof useAuthStore>["error"];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    setUser,
    setTokens,
    setLoading,
    setError,
    login: storeLogin,
    logout: storeLogout,
    clearError,
  } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (tokens?.accessToken) {
        try {
          setLoading(true);
          // Validate current token and get user info
          const user = await authApi.getCurrentUser();
          setUser(user);
        } catch (error) {
          console.error("Failed to initialize auth:", error);
          // Token might be expired, try to refresh
          try {
            await refreshToken();
          } catch (refreshError) {
            console.error("Failed to refresh token:", refreshError);
            storeLogout();
          }
        } finally {
          setLoading(false);
        }
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      clearError();

      const { user, tokens } = await authApi.login({ email, password });
      storeLogin(user, tokens);
    } catch (error: any) {
      setError(error.message || "Login failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);

      if (tokens?.refreshToken) {
        await authApi.logout(tokens.refreshToken);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      storeLogout();
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    if (!tokens?.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const newTokens = await authApi.refreshToken(tokens.refreshToken);
      setTokens(newTokens);
    } catch (error) {
      storeLogout();
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
