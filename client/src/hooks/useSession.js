import { useEffect, useState } from "react";

export function useSession() {
  const [user, setUser] = useState(null);     // { id, email, role } or null
  const [loading, setLoading] = useState(true);

  const RAW_API = import.meta.env.VITE_API_URL ?? "/";
  const API_BASE = RAW_API.endsWith("/") ? RAW_API : RAW_API + "/";

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (alive) setUser(data);
        } else {
          if (alive) setUser(null);
        }
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [API_BASE]);

  const logout = async () => {
    try {
      await fetch(`${API_BASE}auth/logout`, { method: "POST", credentials: "include" });
    } catch {}
    localStorage.removeItem("email");
    setUser(null);
  };

  return { user, loading, logout, API_BASE };
}
