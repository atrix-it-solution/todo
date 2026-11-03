// Relative URL: works when served by the Node server and via the Vite dev proxy.
const BASE = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "todo_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: { username, password } }),
  getTodos: () => request("/todos"),
  createTodo: (title) => request("/todos", { method: "POST", body: { title } }),
  updateTodo: (id, changes) => request(`/todos/${id}`, { method: "PUT", body: changes }),
  deleteTodo: (id) => request(`/todos/${id}`, { method: "DELETE" }),
  deleteMany: (ids) => request("/todos", { method: "DELETE", body: { ids } }),
};
