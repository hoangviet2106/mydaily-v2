import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useOutletContext,useNavigate  } from "react-router-dom";


export default function DashboardHome() {
  const { me, meLoading } = useOutletContext() || {};
    const navigate = useNavigate();
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

  const todayText = useMemo(() => {
    try {
      const d = new Date();
      return d.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "";
    }
  }, []);

  if (error) {
    return (
      <div className="pageWidth">
        <div className="card pad-md">
          <div className="alert">{error}</div>
        </div>
      </div>
    );
  }

  if (!basic) {
    return (
      <div className="pageWidth">
        <div className="dashHeader">
          <div>
            <div className="dashHello">Chào {meLoading ? "…" : me?.name || "bạn"} 👋</div>
            <div className="dashDate">{todayText}</div>
          </div>
        </div>

        <div className="grid">
          <div className="skeleton" style={{ gridColumn: "span 12", height: 140 }} />
          <div className="skeleton" style={{ gridColumn: "span 6" }} />
          <div className="skeleton" style={{ gridColumn: "span 6" }} />
          <div className="skeleton" style={{ gridColumn: "span 6" }} />
          <div className="skeleton" style={{ gridColumn: "span 6" }} />
        </div>
      </div>
    );
  }

  const t = basic.tasksToday;
  const spendingMonth = basic.financeThisMonth?.spendingTotal ?? 0;

  return (
    <div className="pageWidth">
      {/* Header */}
      <div className="dashHeader">
        <div>
          <div className="dashHello">Chào {meLoading ? "…" : me?.name || "bạn"} 👋</div>
          <div className="dashDate">{todayText}</div>
        </div>

        {/* (optional) quick action — để trống cũng ok */}
        {/* <button className="btn btn-primary">+ Tạo task</button> */}
      </div>

      {/* HERO: Today Focus */}
      <div className="dashHero card pad-lg">
        <div className="dashHero__left">
          <div className="dashHero__title">Hôm nay</div>
          <div className="dashHero__sub">
            Tập trung vào việc quan trọng nhất và theo dõi chi tiêu nhẹ nhàng.
          </div>

          <div className="dashHero__stats">
            <HeroStat label="Tasks cần làm" value={t.total} />
            <HeroStat label="Đã hoàn thành" value={t.completed} />
            <HeroStat label="Tỷ lệ" value={`${t.completionRatePercent}%`} />
            <HeroStat label="Chi tiêu tháng" value={formatVND(spendingMonth)} />
          </div>
        </div>

        
<div className="dashHero__right">
  <button
    className="btn btn-primary btn-block dashHero__cta"
    onClick={() => navigate("/tasks")}
  >
    <span>Tiếp tục task tiếp theo</span>
    <span className="dashHero__ctaIcon">→</span>
  </button>

  <div className="dashHero__hint">
    Tip: vào <b>Tasks</b> để chỉnh sửa hoặc thêm việc mới
  </div>
</div>
      </div>

      {/* 2 columns */}
      <div className="dashCols">
        <section className="card pad-md">
          <div className="sectionTitle">Productivity</div>
          <div className="grid dashMiniGrid">
            <MiniStat title="Tasks hôm nay" value={t.total} hint="Created today" />
            <MiniStat title="Hoàn thành" value={t.completed} hint="Marked done today" />
            <MiniStat title="Completion" value={`${t.completionRatePercent}%`} hint="For today" />
          </div>
        </section>

        <section className="card pad-md">
          <div className="sectionTitle">Finance</div>
          <div className="grid dashMiniGrid">
            <MiniStat
              title="Chi tiêu tháng này"
              value={formatVND(spendingMonth)}
              hint="Total expenses (current month)"
            />
            <MiniStat
              title="Loại chi phí"
              value={basic.financeThisMonth?.categoriesCount ?? 0}
              hint="Categories used"
            />
            <MiniStat
              title="Insight"
              value={spendingMonth === 0 ? "✅" : "⚠️"}
              hint={spendingMonth === 0 ? "Chưa phát sinh chi tiêu" : "Có chi tiêu trong tháng"}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function HeroStat({ label, value }) {
  return (
    <div className="heroStat">
      <div className="heroStat__label">{label}</div>
      <div className="heroStat__value">{value}</div>
    </div>
  );
}

function MiniStat({ title, value, hint }) {
  return (
    <div className="miniStat">
      <div className="miniStat__title">{title}</div>
      <div className="miniStat__value">{value}</div>
      <div className="miniStat__hint">{hint}</div>
    </div>
  );
}

function formatVND(n) {
  const num = Number(n || 0);
  return num.toLocaleString("vi-VN") + " ₫";
}
