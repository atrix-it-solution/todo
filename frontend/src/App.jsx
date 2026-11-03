import { useEffect, useState } from "react";
import Login from "./Login.jsx";
import Todos from "./Todos.jsx";
import { api, getToken, getUser, saveUser, clearSession } from "./api.js";

export default function App() {
  const [user, setUser] = useState(() => {
    const u = getToken() ? getUser() : null;
    if (!u) clearSession(); // old login from before accounts existed
    return u;
  });

  const logout = () => {
    clearSession();
    setUser(null);
  };

  // Refresh the user's name/role from the server (e.g. role changed, account deleted)
  useEffect(() => {
    if (!user) return;
    api
      .me()
      .then(({ user: fresh }) => {
        saveUser(fresh);
        setUser(fresh);
      })
      .catch((err) => err.status === 401 && logout());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return user ? <Todos key={user.id} user={user} onLogout={logout} /> : <Login onLogin={setUser} />;
}
