import { Link } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider";

export function HomePage() {
  const { user, loading, logout, refresh } = useAuth();

  return (
    <section className="hero">
      <h1>Foundation</h1>
      <p>
        KISS agent-first fullstack starter: Bun, Hono, React, Drizzle, and strict Zod contracts.
      </p>

      <div className="panel">
        <h2>Session</h2>
        {loading ? (
          <p className="muted">Checking session…</p>
        ) : user ? (
          <div className="stack">
            <p>
              Signed in as <strong>{user.email}</strong>
            </p>
            <p className="muted">User id: {user.id}</p>
            <div className="actions">
              <button type="button" className="secondary" onClick={() => void refresh()}>
                Refresh tokens
              </button>
              <button type="button" onClick={() => void logout()}>
                Log out
              </button>
            </div>
          </div>
        ) : (
          <div className="stack">
            <p className="muted">You are not signed in.</p>
            <div className="actions">
              <Link to="/login">
                <button type="button">Login</button>
              </Link>
              <Link to="/register">
                <button type="button" className="secondary">
                  Register
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
