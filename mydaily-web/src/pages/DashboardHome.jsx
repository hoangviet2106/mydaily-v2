import { useEffect, useState } from "react";
import api from "../api/axios";

export default function DashboardHome() {
  const [basic, setBasic] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get("/dashboard/basic");
        if (!alive) return;
        setBasic(res.data);
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load dashboard.";
        if (!alive) return;
        setError(msg);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <div className="card pad-md">
        <div className="alert">{error}</div>
      </div>
    );
  }

  if (!basic) {
    return (
      <div className="grid">
        <div className="skeleton" style={{ gridColumn: "span 6" }} />
        <div className="skeleton" style={{ gridColumn: "span 6" }} />
        <div className="skeleton" style={{ gridColumn: "span 6" }} />
        <div className="skeleton" style={{ gridColumn: "span 6" }} />
      </div>
    );
  }

  const t = basic.tasksToday;

  return (
    <div className="grid">
      <Stat title="Tasks today" value={t.total} hint="Created today" />
      <Stat title="Completed today" value={t.completed} hint="Marked done today" />
      <Stat
        title="Completion rate"
        value={`${t.completionRatePercent}%`}
        hint="For today"
      />
      <Stat
        title="Spending this month"
        value={formatVND(basic.financeThisMonth.spendingTotal)}
        hint="Total expenses (current month)"
      />
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
