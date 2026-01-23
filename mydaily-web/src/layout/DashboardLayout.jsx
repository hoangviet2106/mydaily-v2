import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

function Icon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg" };
  const stroke = { stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <path {...stroke} d="M3 12h7V3H3v9zM14 21h7V12h-7v9zM14 3h7v7h-7V3zM3 14h7v7H3v-7z" />
        </svg>
      );
    case "tasks":
      return (
        <svg {...common}>
          <path {...stroke} d="M9 11l3 3L22 4" />
          <path {...stroke} d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case "taskreports":
      return (
        <svg {...common}>
          <path {...stroke} d="M3 3h18v18H3z" />
          <path {...stroke} d="M7 13h3" />
          <path {...stroke} d="M7 9h7" />
          <path {...stroke} d="M7 17h5" />
        </svg>
      );
    case "expenses":
      return (
        <svg {...common}>
          <path {...stroke} d="M12 1v22" />
          <path {...stroke} d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "categories":
      return (
        <svg {...common}>
          <path {...stroke} d="M4 6h16" />
          <path {...stroke} d="M4 12h16" />
          <path {...stroke} d="M4 18h16" />
          <path {...stroke} d="M8 6v0" />
        </svg>
      );
    case "budgets":
      return (
        <svg {...common}>
          <path {...stroke} d="M12 1v22" />
          <path {...stroke} d="M7 6h10M7 18h10" />
          <path {...stroke} d="M8 10h8M8 14h8" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <path {...stroke} d="M4 19V5" />
          <path {...stroke} d="M4 19h16" />
          <path {...stroke} d="M8 17v-6" />
          <path {...stroke} d="M12 17V7" />
          <path {...stroke} d="M16 17v-4" />
        </svg>
      );
    case "export":
      return (
        <svg {...common}>
          <path {...stroke} d="M12 3v12" />
          <path {...stroke} d="M8 7l4-4 4 4" />
          <path {...stroke} d="M4 21h16" />
        </svg>
      );
    default:
      return null;
  }
}

function SideLink({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      end={to === "/dashboard"}
      className={({ isActive }) => (isActive ? "sideLink sideLink--active" : "sideLink")}
    >
      <span className="sideLink__icon">
        <Icon name={icon} />
      </span>
      <span className="sideLink__label">{label}</span>
    </NavLink>
  );
}

// ===== helpers =====
function decodeJwtPayload(token) {
  try {
    const parts = String(token).split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeAccountType(me, token) {
  // 1) from /auth/me response
  const raw =
    me?.account_type ??
    me?.accountType ??
    me?.plan ??
    me?.tier ??
    me?.subscription ??
    (typeof me?.is_premium === "boolean" ? (me.is_premium ? "PREMIUM" : "FREE") : undefined);

  if (raw) return String(raw).toUpperCase();

  // 2) fallback from JWT payload
  const payload = token ? decodeJwtPayload(token) : null;
  const raw2 =
    payload?.account_type ??
    payload?.accountType ??
    payload?.plan ??
    payload?.tier ??
    payload?.subscription ??
    (typeof payload?.is_premium === "boolean" ? (payload.is_premium ? "PREMIUM" : "FREE") : undefined);

  if (raw2) return String(raw2).toUpperCase();

  return "FREE";
}

async function fetchMe() {
  const token = localStorage.getItem("token");
  if (!token) return { me: null, token: null };

  const res = await fetch("http://localhost:3000/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return { me: null, token };
  const data = await res.json();
  return { me: data, token };
}

export default function DashboardLayout() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const out = await fetchMe();
        if (!alive) return;

        setMe(out.me);
        setToken(out.token);

        // Debug nhẹ: nếu API không trả plan, bạn sẽ thấy warning
        const hasPlan =
          out.me?.account_type != null ||
          out.me?.accountType != null ||
          out.me?.plan != null ||
          out.me?.tier != null ||
          out.me?.subscription != null ||
          typeof out.me?.is_premium === "boolean";
        if (!hasPlan) {
          console.warn("[MyDaily] /auth/me does not include account type fields. Response:", out.me);
        }
      } finally {
        if (alive) setMeLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const onLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const accountType = useMemo(() => normalizeAccountType(me, token), [me, token]);
  const displayName =
    me?.name ||
    me?.email ||
    localStorage.getItem("displayName") ||
    "Bạn";


  return (
    <div className="appShell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">MyDaily</div>
          <div className="sidebar__sub">Trợ lý cho cuộc sống thông minh</div>
        </div>

        <nav className="sidebar__nav">
          <SideLink to="/dashboard" icon="dashboard" label="Dashboard" />
          <SideLink to="/tasks" icon="tasks" label="Tasks" />
          <SideLink to="/task-reports" icon="taskreports" label="Task Reports" />
          <SideLink to="/expenses" icon="expenses" label="Expenses" />
          <SideLink to="/categories" icon="categories" label="Categories" />
          <SideLink to="/budgets" icon="budgets" label="Budgets" />
          <SideLink to="/reports" icon="reports" label="Finance Reports" />
          <SideLink to="/export" icon="export" label="Export Data" />


        </nav>

        <div className="sidebar__foot">
          <div className={accountType === "PREMIUM" ? "pill pill--premium" : "pill"}>
            🟢{meLoading ? "…" : accountType}
          </div>
          <button className="btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="main__top">
          <div>
            <div className="main__title">MyDaily</div>
            <div className="p-muted">{meLoading ? "Xin chào…" : `Xin chào, ${displayName}`}</div>
          </div>
        </div>

        <div className="main__content">
          <Outlet context={{ accountType, me, meLoading }} />
        </div>
      </main>
    </div>
  );
}
