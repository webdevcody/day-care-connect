import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getToken, setToken, removeToken } from "./secure-store";
import { setOnUnauthorized } from "../api/client";
import * as endpoints from "../api/endpoints";
import type { User } from "../api/endpoints";

interface AuthState {
  isLoading: boolean;
  user: User | null;
  token: string | null;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    user: null,
    token: null,
  });

  const clearAuth = useCallback(() => {
    setState({ isLoading: false, user: null, token: null });
  }, []);

  useEffect(() => {
    setOnUnauthorized(clearAuth);
  }, [clearAuth]);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await getToken();
        if (!storedToken) {
          setState({ isLoading: false, user: null, token: null });
          return;
        }
        const { user } = await endpoints.getSession();
        setState({ isLoading: false, user, token: storedToken });
      } catch {
        await removeToken();
        setState({ isLoading: false, user: null, token: null });
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await endpoints.signIn(email, password);
    await setToken(result.token);
    setState({ isLoading: false, user: result.user, token: result.token });
  }, []);

  const signUp = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      role: string;
    }) => {
      const result = await endpoints.signUp({
        ...data,
        name: `${data.firstName} ${data.lastName}`.trim(),
      });
      await setToken(result.token);
      setState({ isLoading: false, user: result.user, token: result.token });
    },
    [],
  );

  const signOut = useCallback(async () => {
    await removeToken();
    setState({ isLoading: false, user: null, token: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
