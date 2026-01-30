import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api/axios";

export default function RequireAdmin({ children }) {
  const [ok, setOk] = useState(null); // null = loading
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setOk(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const res = await api.get("/users/me"); // { user }
        const me = res.data?.user ?? res.data ?? null;
        if (!mounted) return;

        setOk(me?.role === "ADMIN");
      } catch {
        if (!mounted) return;
        setOk(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (ok === null) return null; // hoặc spinner component
  if (!ok) return <Navigate to="/dashboard" replace state={{ from: location }} />;

  return children;
}
