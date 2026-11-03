import { useEffect, useState } from "react";
import { api } from "./api.js";

export default function Todos({ onLogout }) {
  const [todos, setTodos] = useState([]);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Wrap API calls: show errors, log out on expired token.
  const run = async (fn) => {
    setError("");
    try {
      return await fn();
    } catch (err) {
      if (err.status === 401) return onLogout();
      setError(err.message);
    }
  };

  // GET
  const load = () =>
    run(async () => {
      const data = await api.getTodos();
      setTodos(data);
      setSelected((prev) => new Set([...prev].filter((id) => data.some((t) => t.id === id))));
    }).finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // POST
  const addTodo = (e) => {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;
    run(async () => {
      const created = await api.createTodo(text);
      setTodos((prev) => [created, ...prev]);
      setTitle("");
    });
  };

  // PUT (toggle completed)
  const toggle = (todo) =>
    run(async () => {
      const updated = await api.updateTodo(todo.id, { completed: !todo.completed });
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    });

  // PUT (edit title)
  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditText(todo.title);
  };
  const saveEdit = (id) => {
    const text = editText.trim();
    if (!text) return;
    run(async () => {
      const updated = await api.updateTodo(id, { title: text });
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingId(null);
    });
  };

  // DELETE (single)
  const remove = (id) => {
    if (!window.confirm("Delete this todo?")) return;
    run(async () => {
      await api.deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  };

  // DELETE (multiple)
  const removeSelected = () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} selected todo(s)?`)) return;
    run(async () => {
      await api.deleteMany(ids);
      setTodos((prev) => prev.filter((t) => !selected.has(t.id)));
      setSelected(new Set());
    });
  };

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const allSelected = todos.length > 0 && selected.size === todos.length;
  const toggleSelectAll = () =>
    setSelected(allSelected ? new Set() : new Set(todos.map((t) => t.id)));

  const doneCount = todos.filter((t) => t.completed).length;

  return (
    <div className="center">
      <div className="card todos">
        <header>
          <h1>My Todos</h1>
          <button onClick={onLogout}>Logout</button>
        </header>

        <form className="add" onSubmit={addTodo}>
          <input
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button type="submit" className="primary">Add</button>
        </form>

        {error && <p className="error">{error}</p>}

        <div className="toolbar">
          <label>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              disabled={!todos.length}
            />
            Select all
          </label>
          <span className="muted">
            {doneCount}/{todos.length} done
          </span>
          <button
            className="danger"
            onClick={removeSelected}
            disabled={!selected.size}
          >
            Delete selected ({selected.size})
          </button>
        </div>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : todos.length === 0 ? (
          <p className="muted">No todos yet. Add one above.</p>
        ) : (
          <ul>
            {todos.map((todo) => (
              <li key={todo.id} className={todo.completed ? "done" : ""}>
                <input
                  type="checkbox"
                  title="Select"
                  checked={selected.has(todo.id)}
                  onChange={() => toggleSelect(todo.id)}
                />
                {editingId === todo.id ? (
                  <>
                    <input
                      className="edit"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(todo.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                    />
                    <button className="primary" onClick={() => saveEdit(todo.id)}>Save</button>
                    <button onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span className="title" onDoubleClick={() => startEdit(todo)}>
                      {todo.title}
                    </span>
                    <button onClick={() => toggle(todo)}>
                      {todo.completed ? "Undo" : "Done"}
                    </button>
                    <button onClick={() => startEdit(todo)}>Edit</button>
                    <button className="danger" onClick={() => remove(todo.id)}>Delete</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
