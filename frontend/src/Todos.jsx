import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import TodoItem from "./TodoItem.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import {
  Logo,
  PlusIcon,
  SearchIcon,
  XIcon,
  LogOutIcon,
  TrashIcon,
  ListCheckIcon,
  SparkleIcon,
} from "./icons.jsx";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "done", label: "Completed" },
];

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Todos({ onLogout }) {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [toasts, setToasts] = useState([]);

  // ---------- helpers ----------
  const toast = useCallback((text, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const fail = (err) => {
    if (err?.status === 401) return onLogout();
    toast(err?.message || "Something went wrong", "error");
  };

  const replaceTodo = (updated) => setTodos((p) => p.map((t) => (t.id === updated.id ? updated : t)));

  const removeLocal = (ids) => {
    const gone = new Set(ids);
    setTodos((p) => p.filter((t) => !gone.has(t.id)));
    setSelected((p) => new Set([...p].filter((id) => !gone.has(id))));
  };

  // ---------- GET ----------
  useEffect(() => {
    api
      .getTodos()
      .then(setTodos)
      .catch(fail)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- POST (optimistic: shows instantly, input clears right away) ----------
  const addTodo = (e) => {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;
    const tempId = `tmp-${Date.now()}-${Math.random()}`;
    const now = new Date().toISOString();
    setTodos((p) => [{ id: tempId, title: text, completed: false, created_at: now, updated_at: now, pending: true }, ...p]);
    setTitle("");
    if (filter === "done") setFilter("all");

    api
      .createTodo(text)
      .then((created) => setTodos((p) => p.map((t) => (t.id === tempId ? created : t))))
      .catch((err) => {
        setTodos((p) => p.filter((t) => t.id !== tempId));
        setTitle((cur) => cur || text); // give the text back so nothing is lost
        fail(err);
      });
  };

  // ---------- PUT (toggle, optimistic) ----------
  const toggle = async (todo) => {
    const next = !todo.completed;
    replaceTodo({ ...todo, completed: next });
    try {
      replaceTodo(await api.updateTodo(todo.id, { completed: next }));
    } catch (err) {
      replaceTodo(todo);
      fail(err);
    }
  };

  // ---------- PUT (edit title) ----------
  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditText(todo.title);
  };

  const saveEdit = async (todo) => {
    const text = editText.trim();
    if (!text) return;
    if (text === todo.title) return setEditingId(null);
    try {
      replaceTodo(await api.updateTodo(todo.id, { title: text }));
      setEditingId(null);
      toast("Task updated");
    } catch (err) {
      fail(err);
    }
  };

  // ---------- DELETE (single + multiple) ----------
  const askDelete = (todo) =>
    setConfirm({
      title: "Delete this task?",
      message: `“${todo.title}” will be permanently deleted.`,
      action: async () => {
        await api.deleteTodo(todo.id);
        removeLocal([todo.id]);
        toast("Task deleted");
      },
    });

  const askDeleteMany = (ids, { title: dlgTitle, done } = {}) =>
    setConfirm({
      title: dlgTitle || `Delete ${plural(ids.length, "task")}?`,
      message: "This can't be undone.",
      action: async () => {
        const res = await api.deleteMany(ids);
        removeLocal(ids);
        done?.();
        toast(`${plural(res.count, "task")} deleted`);
      },
    });

  const handleConfirm = async () => {
    setConfirmBusy(true);
    try {
      await confirm.action();
    } catch (err) {
      fail(err);
    } finally {
      setConfirmBusy(false);
      setConfirm(null);
    }
  };
  const closeConfirm = useCallback(() => setConfirm(null), []);

  // ---------- selection ----------
  const enterSelect = () => {
    setEditingId(null);
    setSelectMode(true);
  };
  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };
  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ---------- derived ----------
  const total = todos.length;
  const doneCount = todos.filter((t) => t.completed).length;
  const activeCount = total - doneCount;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  const counts = { all: total, active: activeCount, done: doneCount };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return todos.filter((t) => {
      if (filter === "active" && t.completed) return false;
      if (filter === "done" && !t.completed) return false;
      return !q || t.title.toLowerCase().includes(q);
    });
  }, [todos, filter, query]);

  const selectable = visible.filter((t) => !t.pending);
  const allVisibleSelected = selectable.length > 0 && selectable.every((t) => selected.has(t.id));
  const toggleSelectAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      selectable.forEach((t) => (allVisibleSelected ? next.delete(t.id) : next.add(t.id)));
      return next;
    });

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const heroSub =
    total === 0
      ? "Let's plan your day."
      : activeCount === 0
      ? "Everything's done. Great work!"
      : `You have ${plural(activeCount, "task")} left today.`;

  let empty = null;
  if (!loading && visible.length === 0) {
    if (query.trim()) empty = { title: "No matching tasks", text: `Nothing found for “${query.trim()}”.` };
    else if (filter === "done") empty = { title: "No completed tasks yet", text: "Tick a task to mark it as done." };
    else if (filter === "active" && total) empty = { title: "All caught up!", text: "You've finished every task." };
    else empty = { title: "No tasks yet", text: "Add your first task above to get started." };
  }

  // ---------- render ----------
  return (
    <div className={`app ${selectMode ? "with-bulk" : ""}`}>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <Logo size={32} />
            <span>TaskFlow</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onLogout} title="Log out">
            <LogOutIcon size={18} />
            <span className="hide-xs">Log out</span>
          </button>
        </div>
      </header>

      <main className="content">
        <section className="hero">
          <div className="hero-text">
            <p className="hero-date">{today}</p>
            <h1>{greeting()}</h1>
            <p className="hero-sub">{heroSub}</p>
          </div>
          <div
            className="ring"
            style={{ "--pct": pct }}
            role="img"
            aria-label={`${pct}% of tasks completed`}
          >
            <div className="ring-inner">
              <strong>{pct}%</strong>
              <small>done</small>
            </div>
          </div>
        </section>

        <form className="add-bar" onSubmit={addTodo}>
          <PlusIcon className="add-icon" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new task…"
            maxLength={200}
            aria-label="New task"
          />
          <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
            Add
          </button>
        </form>

        <div className="toolbar">
          <div className="tabs" role="tablist" aria-label="Filter tasks">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                className={`tab ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                <span className="count">{counts[f.key]}</span>
              </button>
            ))}
          </div>

          <div className="search">
            <SearchIcon size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks"
              aria-label="Search tasks"
            />
            {query && (
              <button className="icon-btn sm" onClick={() => setQuery("")} aria-label="Clear search">
                <XIcon size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="list-head">
          {selectMode ? (
            <>
              <button className="link-btn" onClick={toggleSelectAll} disabled={!selectable.length}>
                {allVisibleSelected ? "Deselect all" : "Select all"}
              </button>
              <button className="link-btn" onClick={exitSelect}>Done</button>
            </>
          ) : (
            <>
              <button className="link-btn" onClick={enterSelect} disabled={!total}>
                <ListCheckIcon size={18} /> Select
              </button>
              {doneCount > 0 && (
                <button
                  className="link-btn danger"
                  onClick={() =>
                    askDeleteMany(
                      todos.filter((t) => t.completed).map((t) => t.id),
                      { title: `Clear ${plural(doneCount, "completed task")}?` }
                    )
                  }
                >
                  Clear completed
                </button>
              )}
            </>
          )}
        </div>

        {loading ? (
          <ul className="list" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="item skeleton">
                <span className="sk-circle" />
                <span className="sk-line" />
              </li>
            ))}
          </ul>
        ) : empty ? (
          <div className="empty">
            <div className="empty-icon">
              <SparkleIcon size={28} />
            </div>
            <h3>{empty.title}</h3>
            <p>{empty.text}</p>
          </div>
        ) : (
          <ul className="list">
            {visible.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                selectMode={selectMode}
                selected={selected.has(todo.id)}
                onSelect={() => !todo.pending && toggleSelect(todo.id)}
                onToggle={() => toggle(todo)}
                editing={editingId === todo.id}
                editText={editText}
                onEditText={setEditText}
                onStartEdit={() => startEdit(todo)}
                onSave={() => saveEdit(todo)}
                onCancel={() => setEditingId(null)}
                onDelete={() => askDelete(todo)}
              />
            ))}
          </ul>
        )}
      </main>

      {selectMode && (
        <div className="bulk-bar" role="region" aria-label="Bulk actions">
          <div className="bulk-inner">
            <span>
              <strong>{selected.size}</strong> selected
            </span>
            <div className="bulk-actions">
              <button className="btn btn-ghost btn-sm" onClick={exitSelect}>Cancel</button>
              <button
                className="btn btn-danger btn-sm"
                disabled={!selected.size}
                onClick={() => askDeleteMany([...selected], { done: () => setSelectMode(false) })}
              >
                <TrashIcon size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        busy={confirmBusy}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
      />

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
