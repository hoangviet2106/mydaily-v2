import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

/* ================= Icons ================= */
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
    case "profile":
      return (
        <svg {...common}>
          <path {...stroke} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <path {...stroke} d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </svg>
      );
    case "admin":
      return (
        <svg {...common}>
          <path {...stroke} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
          <path {...stroke} d="M4 21v-1a7 7 0 0 1 14 0v1" />
          <path {...stroke} d="M18 8h3" />
          <path {...stroke} d="M19.5 6.5v3" />
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

/* ================= helpers ================= */
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
  const raw =
    me?.account_type ??
    me?.accountType ??
    me?.plan ??
    me?.tier ??
    me?.subscription ??
    (typeof me?.is_premium === "boolean" ? (me.is_premium ? "PREMIUM" : "FREE") : undefined);

  if (raw) return String(raw).toUpperCase();

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

/* IMPORTANT:
   Dùng api (axios) để tự gắn Authorization header + baseURL "/api"
   => backend route: /users/me
*/
async function fetchMeApi() {
  const res = await api.get("/users/me"); // expects { user }
  return res.data;
}

export default function DashboardLayout() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const refreshMe = async () => {
    const t = localStorage.getItem("token");
    if (!t) {
      setMe(null);
      setToken(null);
      setMeLoading(false);
      return;
    }

    setMeLoading(true);
    try {
      const data = await fetchMeApi(); // { user }
      setMe(data?.user ?? data ?? null);
      setToken(t);
    } catch (e) {
      // nếu token hỏng/expired, api interceptor có thể xóa token rồi
      setMe(null);
      setToken(null);
    } finally {
      setMeLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogout = () => {
    localStorage.removeItem("token");
    setMe(null);
    setToken(null);
    navigate("/login");
  };

  const accountType = useMemo(() => normalizeAccountType(me, token), [me, token]);

  // Ưu tiên: name -> phần trước @ của email -> "Bạn"
  const displayName = useMemo(() => {
    const name = String(me?.name || "").trim();
    if (name) return name;

    const email = String(me?.email || "").trim();
    if (email && email.includes("@")) return email.split("@")[0];

    return "Bạn";
  }, [me]);

  const location = useLocation();

  const pageName = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/admin")) return "Admin";
    if (p.startsWith("/tasks")) return "Tasks";
    if (p.startsWith("/task-reports")) return "Task Reports";
    if (p.startsWith("/expenses")) return "Expenses";
    if (p.startsWith("/categories")) return "Categories";
    if (p.startsWith("/budgets")) return "Budgets";
    if (p.startsWith("/reports")) return "Finance Reports";
    if (p.startsWith("/export")) return "Export Data";
    if (p.startsWith("/profile")) return "Profile";
    return "Dashboard";
  }, [location.pathname]);


  return (
    <div className="appShell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">MyDaily</div>
          <div className="sidebar__sub">Trợ lý cho cuộc sống thông minh</div>
        </div>

        <nav className="sidebar__nav">
          <SideLink to="/dashboard" icon="dashboard" label="Trang chủ" />
          <SideLink to="/tasks" icon="tasks" label="Công việc" />
          <SideLink to="/task-reports" icon="taskreports" label="Báo cáo công việc" />
          <SideLink to="/expenses" icon="expenses" label="Chi tiêu" />
          <SideLink to="/categories" icon="categories" label="Danh mục" />
          <SideLink to="/budgets" icon="budgets" label="Ngân sách" />
          <SideLink to="/reports" icon="reports" label="Báo cáo chi tiêu" />
          <SideLink to="/export" icon="export" label="Trích xuất dữ liệu" />
          {me?.role === "ADMIN" && (
            <SideLink to="/admin/users" icon="admin" label="Quản lý người dùng" />
          )}


          {/* NEW: Profile */}
          <SideLink to="/profile" icon="profile" label="Thông tin" />
        </nav>

        <div className="sidebar__foot">
          <div
            className={`planBadge ${accountType === "PREMIUM" ? "planBadge--premium" : "planBadge--free"
              }`}
            title={accountType === "PREMIUM" ? "Premium Plan" : "Free Plan"}
          >
            <span className="planBadge__dot" />
            <span className="planBadge__text">{meLoading ? "Loading" : accountType}</span>
            {accountType === "PREMIUM" && <span className="planBadge__icon">👑</span>}
          </div>

          <button className="btn btn--ghost" onClick={onLogout}>
            Logout
          </button>
        </div>


      </aside>

      {/* Main */}
      <main className="main">
        {/* ✅ TOPBAR */}
        <div className="topbar">
          <div className="topbar__left">
            <div className="crumbs">
              Dashboard / <b>{pageName}</b>
            </div>
          </div>

          <div className="topbar__right">
            <div className="topbar__hello">Chào, {meLoading ? "…" : displayName}</div>
            <div className="topbar__avatar">
              {me?.avatar_url ? (
                <img
                  src={me.avatar_url}
                  alt={displayName}
                  className="topbar__avatarImg"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="topbar__avatar">
                  {(displayName || "M").slice(0, 1).toUpperCase()}
                </div>
              )}

            </div>
          </div>
        </div>

        <div className="main__content">
          <Outlet context={{ accountType, me, meLoading, refreshMe }} />
        </div>
      </main>

    </div>
  );
}
