"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { api, setToken } from "@/lib/api";

interface User {
  id: number;
  email: string;
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const persistToken = useCallback((token: string | null) => {
    if (token) {
      localStorage.setItem("token", token);
      document.cookie = `token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`;
    } else {
      localStorage.removeItem("token");
      document.cookie = "token=; path=/; max-age=0";
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (stored) {
      setToken(stored);
      api.auth.me().then(setUser).catch(() => {
        persistToken(null);
        setToken(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [persistToken]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    persistToken(res.access_token);
    setToken(res.access_token);
    const user = await api.auth.me();
    setUser(user);
  }, [persistToken]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await api.auth.register({
      email,
      password,
      full_name: name,
    });
    persistToken(res.access_token);
    setToken(res.access_token);
    const user = await api.auth.me();
    setUser(user);
  }, [persistToken]);

  const logout = useCallback(() => {
    persistToken(null);
    setToken(null);
    setUser(null);
  }, [persistToken]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
