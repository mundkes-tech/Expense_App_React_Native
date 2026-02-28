import {
    API_BASE_URL,
    clearSession,
    fetchWithTimeout,
    readSession,
    saveSession,
} from "@/lib/finance";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const session = await readSession();
      if (session?.token) {
        setToken(session.token);
        setUser(session.user ?? null);
      }
      setLoadingAuth(false);
    };

    bootstrap();
  }, []);

  const signIn = async (email, password) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    setToken(data.token);
    setUser(data.user);
    await saveSession({ token: data.token, user: data.user });
  };

  const signUp = async (name, email, password) => {
    const response = await fetchWithTimeout(`${API_BASE_URL}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Signup failed");
    }

    setToken(data.token);
    setUser(data.user);
    await saveSession({ token: data.token, user: data.user });
  };

  const signOut = async () => {
    await clearSession();
    setToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, loadingAuth, signIn, signUp, signOut }),
    [token, user, loadingAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
