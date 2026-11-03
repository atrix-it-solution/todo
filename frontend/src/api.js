// Relative URL: works when served by the Node server and via the Vite dev proxy.
const BASE = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "todo_token";
const USER_KEY = "todo_user";
export const PUSH_ENDPOINT_KEY = "todo_push_endpoint";

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const getToken = () => read(TOKEN_KEY);
export const getUser = () => {
  try {
    return JSON.parse(read(USER_KEY));
  } catch {
    return null;
  }
};
export const saveUser = (user) => localStorage.setItem(USER_KEY, JSON.stringify(user));
export const setSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  saveUser(user);
};
export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

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
  // auth
  login: (username, password) => request("/auth/login", { method: "POST", body: { username, password } }),
  me: () => request("/auth/me"),

  // todos
  getTodos: () => request("/todos"),
  createTodo: (title, assignedTo) =>
    request("/todos", {
      method: "POST",
      body: assignedTo === undefined ? { title } : { title, assigned_to: assignedTo },
    }),
  updateTodo: (id, changes) => request(`/todos/${id}`, { method: "PUT", body: changes }),
  deleteTodo: (id) => request(`/todos/${id}`, { method: "DELETE" }),
  deleteMany: (ids) => request("/todos", { method: "DELETE", body: { ids } }),

  // users (admin only)
  getUsers: () => request("/users"),
  createUser: (user) => request("/users", { method: "POST", body: user }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),

  // push notifications
  pushPublicKey: () => request("/push/public-key"),
  pushSubscribe: (subscription) => request("/push/subscribe", { method: "POST", body: { subscription } }),
  pushUnsubscribe: (endpoint) => request("/push/unsubscribe", { method: "POST", body: { endpoint } }),
};
