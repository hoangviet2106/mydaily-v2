import { useEffect, useState } from "react";
import api from "../api/axios";
import logo from "../assets/mydailylogo.png";


export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [basic, setBasic] = useState(null);
  const [error, setError] = useState("");

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  useEffect(() => {
    (async () => {
      try {
        const [meRes, basicRes] = await Promise.all([
          api.get("/users/me"),
          api.get("/dashboard/basic"),
        ]);
        setMe(meRes.data.user);
        setBasic(basicRes.data);
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load dashboard.";
        setError(msg);
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="container">
        <div className="card pad-md">
          <div className="alert">{error}</div>
          <button className="btn" onClick={logout} style={{ marginTop: 12 }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!me || !basic) {
    return (
      <div className="container">
        <div className="topbar">
          <div className="brand">
            <div className="brand__logo" />
            <div>
              <h3 className="brand__title">MyDaily</h3>
              <p className="brand__subtitle">Smart Life Assistant</p>
            </div>
          </div>
        </div>

        <div className="grid">
          <div className="skeleton" style={{ gridColumn: "span 6" }} />
          <div className="skeleton" style={{ gridColumn: "span 6" }} />
          <div className="skeleton" style={{ gridColumn: "span 6" }} />
          <div className="skeleton" style={{ gridColumn: "span 6" }} />
        </div>
      </div>
    );
  }

  const t = basic.tasksToday;

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <img src={logo} alt="MyDaily logo" className="brand__logo-img" />

          <div>
            <h3 className="brand__title">MyDaily</h3>
            <p className="brand__subtitle">
              Good day, <b>{me.name}</b>
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="badge" title="Account tier">
            <span className="badge__dot" />
            {me.account_type}
          </div>
          <button className="btn" onClick={logout}>Logout</button>
        </div>
      </div>

      <div className="grid">
        <Stat title="Tasks today" value={t.total} hint="Created today" />
        <Stat title="Completed today" value={t.completed} hint="Marked done today" />
        <Stat title="Completion rate" value={`${t.completionRatePercent}%`} hint="For today" />
        <Stat
          title="Spending this month"
          value={formatVND(basic.financeThisMonth.spendingTotal)}
          hint="Total expenses (current month)"
        />
      </div>
    </div>
  );
}

function Stat({ title, value, hint }) {
  return (
    <div className="stat">
      <p className="stat__title">{title}</p>
      <div className="stat__value">{value}</div>
      <div className="stat__hint">{hint}</div>
    </div>
  );
}

function formatVND(n) {
  const num = Number(n || 0);
  return num.toLocaleString("vi-VN") + " ₫";
}
