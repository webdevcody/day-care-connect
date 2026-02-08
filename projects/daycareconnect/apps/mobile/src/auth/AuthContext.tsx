import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getToken, setToken, removeToken } from "./secure-store";
import { createApiClient, getApiClient } from "@daycare-hub/services";
import Constants from "expo-constants";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  image: string | null;
}

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

  const clearAuth = useCallback(async () => {
    await removeToken();
    setState({ isLoading: false, user: null, token: null });
  }, []);

  useEffect(() => {
    const baseURL =
      Constants.expoConfig?.extra?.apiUrl || "http://localhost:4000";

    createApiClient({
      baseURL,
      getHeaders: async () => {
        const token = await getToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
      onUnauthorized: () => {
        clearAuth();
      },
    });
  }, [clearAuth]);

  useEffect(() => {
    (async () => {
      try {
        const storedToken = await getToken();
        if (!storedToken) {
          setState({ isLoading: false, user: null, token: null });
          return;
        }
        const { user } = await getApiClient().get<{ user: User }>("/api/auth/get-session");
        setState({ isLoading: false, user, token: storedToken });
      } catch {
        await removeToken();
        setState({ isLoading: false, user: null, token: null });
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await getApiClient().post<{ token: string; user: User }>(
      "/api/auth/sign-in/email",
      { email, password },
    );
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
      const result = await getApiClient().post<{ token: string; user: User }>(
        "/api/auth/sign-up/email",
        { ...data, name: `${data.firstName} ${data.lastName}`.trim() },
      );
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
