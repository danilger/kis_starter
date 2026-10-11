import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "../../shared/api/client";
import { clearSession, getAccessToken, getRefreshToken, setSession } from "./session";

type User = {
  id: string;
  email: string;
  createdAt: string;
};

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
    setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const res = await api.api.auth.register.$post({ json: { email, password } });
    if (!res.ok) {
      throw new Error(await readError(res));
    }
    const data = await res.json();
    setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api.api.auth.logout.$post({ json: { refreshToken } });
    }
    clearSession();
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token");
    }
    const res = await api.api.auth.refresh.$post({ json: { refreshToken } });
    if (!res.ok) {
      clearSession();
      setUser(null);
      throw new Error(await readError(res));
    }
    const data = await res.json();
    setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
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
