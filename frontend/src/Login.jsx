import { useState } from "react";
import { api, setSession } from "./api.js";
import { Logo, UserIcon, LockIcon, EyeIcon, EyeOffIcon, AlertIcon } from "./icons.jsx";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState(0); // re-triggers the shake animation
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter your username and password");
      setErrorKey((k) => k + 1);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { token, user } = await api.login(username.trim(), password);
      setSession(token, user);
      onLogin(user);
    } catch (err) {
      setError(err.message);
      setErrorKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-bg" aria-hidden="true">
        <span />
        <span />
      </div>

      <form className="auth-card" onSubmit={submit} noValidate>
        <div className="auth-brand">
          <Logo size={56} />
          <span>TaskFlow</span>
        </div>

        <h1>Welcome back</h1>
        <p className="auth-sub">Sign in to continue to your tasks</p>

        <div className="field">
          <label htmlFor="username">Username</label>
          <div className="input-wrap">
            <UserIcon />
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              autoFocus
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="input-wrap">
            <LockIcon />
            <input
              id="password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="icon-btn sm"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
              title={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="alert" role="alert" key={errorKey}>
            <AlertIcon size={18} />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p className="auth-foot">© {new Date().getFullYear()} TaskFlow</p>
    </div>
  );
}
