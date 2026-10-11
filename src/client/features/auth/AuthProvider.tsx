import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { InferResponseType } from "hono/client";
import { api } from "../../shared/api/client";
import { clearSession, getAccessToken, setAccessToken } from "./session";

type User = InferResponseType<typeof api.api.auth.me.$get, 200>;

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readError(res: { status: number; json: () => Promise<unknown> }): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const accessToken = getAccessToken();
    if (!accessToken) {
      setUser(null);
      return;
    }

    const res = await api.api.auth.me.$get({
      header: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      clearSession();
      setUser(null);
      return;
    }

    setUser(await res.json());
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const refreshRes = await api.api.auth.refresh.$post();
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          if ("accessToken" in data) {
            setAccessToken(data.accessToken);
            setUser(data.user);
            return;
          }
        }
        await loadMe();
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.api.auth.login.$post({ json: { email, password } });
    if (!res.ok) {
      throw new Error(await readError(res));
    }
    const data = await res.json();
    if (!("accessToken" in data)) {
      throw new Error("Unexpected login response");
    }
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const res = await api.api.auth.register.$post({ json: { email, password } });
    if (!res.ok) {
      throw new Error(await readError(res));
    }
    const data = await res.json();
    if (!("accessToken" in data)) {
      throw new Error("Unexpected register response");
    }
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.api.auth.logout.$post();
    clearSession();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const res = await api.api.auth.refresh.$post();
    if (!res.ok) {
      clearSession();
      setUser(null);
      throw new Error(await readError(res));
    }
    const data = await res.json();
    if (!("accessToken" in data)) {
      clearSession();
      setUser(null);
      throw new Error("Unexpected refresh response");
    }
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
