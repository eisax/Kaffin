"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient, setAuthToken, clearAuthToken } from "@/lib/api/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  organizationId?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, organizationName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("odoo_deployer_token") || localStorage.getItem("kaffin_token");
    const savedUser = localStorage.getItem("odoo_deployer_user") || localStorage.getItem("kaffin_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        clearAuthToken();
        localStorage.removeItem("odoo_deployer_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiClient<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data && data.token) {
      setToken(data.token);
      setUser(data.user);
      setAuthToken(data.token);
      localStorage.setItem("odoo_deployer_user", JSON.stringify(data.user));
      localStorage.setItem("kaffin_user", JSON.stringify(data.user));
    }
  };

  const register = async (name: string, email: string, password: string, organizationName?: string) => {
    const data = await apiClient<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, organizationName }),
    });

    if (data && data.token) {
      setToken(data.token);
      setUser(data.user);
      setAuthToken(data.token);
      localStorage.setItem("odoo_deployer_user", JSON.stringify(data.user));
      localStorage.setItem("kaffin_user", JSON.stringify(data.user));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    clearAuthToken();
    localStorage.removeItem("odoo_deployer_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
