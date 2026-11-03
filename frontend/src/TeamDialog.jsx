import { useEffect, useState } from "react";
import { api } from "./api.js";
import Avatar, { displayName } from "./Avatar.jsx";
import { XIcon, TrashIcon, UserPlusIcon, EyeIcon, EyeOffIcon } from "./icons.jsx";

/** Admin-only: list team members, add new ones, remove them. */
export default function TeamDialog({ open, me, users, onClose, onUsersChange, onError, toast }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const addUser = async (e) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const created = await api.createUser({ username: username.trim(), password, role });
      onUsersChange([...users, created]);
      toast(`${displayName(created.username)} added`);
      setUsername("");
      setPassword("");
      setRole("employee");
    } catch (err) {
      if (err.status === 401) return onError(err);
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (u) => {
    setDeletingId(u.id);
    try {
      await api.deleteUser(u.id);
      onUsersChange(users.filter((x) => x.id !== u.id), { removed: u.id });
      toast(`${displayName(u.username)} removed`);
    } catch (err) {
      onError(err);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="team-title" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2 id="team-title">Team</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <XIcon />
          </button>
        </div>

        <ul className="team-list">
          {users.map((u) => (
            <li key={u.id}>
              <Avatar name={u.username} size={38} />
              <div className="team-info">
                <strong>
                  {displayName(u.username)}
                  {u.id === me.id && <span className="you"> (you)</span>}
                </strong>
                <span>
                  <span className={`role-badge ${u.role}`}>{u.role === "admin" ? "Admin" : "Employee"}</span>
                  {u.open_tasks > 0 && ` · ${u.open_tasks} open task${u.open_tasks === 1 ? "" : "s"}`}
                </span>
              </div>
              {u.id !== me.id &&
                (confirmId === u.id ? (
                  <div className="team-confirm">
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)} disabled={deletingId === u.id}>
                      Keep
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeUser(u)} disabled={deletingId === u.id}>
                      {deletingId === u.id ? <span className="spinner" /> : "Remove"}
                    </button>
                  </div>
                ) : (
                  <button className="icon-btn danger" onClick={() => setConfirmId(u.id)} aria-label={`Remove ${u.username}`}>
                    <TrashIcon size={18} />
                  </button>
                ))}
            </li>
          ))}
        </ul>

        <form className="team-form" onSubmit={addUser}>
          <h3>
            <UserPlusIcon size={18} /> Add a team member
          </h3>
          <div className="input-wrap">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="Username"
              required
            />
          </div>
          <div className="input-wrap">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              autoComplete="new-password"
              aria-label="Password"
              required
            />
            <button
              type="button"
              className="icon-btn sm"
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </div>
          <div className="segmented" role="radiogroup" aria-label="Role">
            {["employee", "admin"].map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={role === r}
                className={role === r ? "active" : ""}
                onClick={() => setRole(r)}
              >
                {r === "admin" ? "Admin" : "Employee"}
              </button>
            ))}
          </div>
          {formError && <p className="form-error">{formError}</p>}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={saving || !username.trim() || password.length < 6}
          >
            {saving ? <span className="spinner" /> : "Add member"}
          </button>
        </form>
      </div>
    </div>
  );
}
