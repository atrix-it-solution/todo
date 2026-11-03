import { useState } from "react";
import Login from "./Login.jsx";
import Todos from "./Todos.jsx";
import { getToken, clearToken } from "./api.js";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(getToken()));

  const logout = () => {
    clearToken();
    setLoggedIn(false);
  };

  return loggedIn ? (
    <Todos onLogout={logout} />
  ) : (
    <Login onLogin={() => setLoggedIn(true)} />
  );
}
