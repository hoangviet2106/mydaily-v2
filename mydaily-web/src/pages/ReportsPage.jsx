import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { fetchCategories } from "../api/category";
import {
  getBreakdownByCategory,
  getBudgetVsActual,
  getPeriodicTotals,
  getTopCategories,
  getTrendLastNMonths,
} from "../api/reports";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function monthStartYear() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}
function formatMoney(v) {
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN");
}

function Tab({ active, onClick, children }) {
  return (
    <button className={active ? "tab tab--active" : "tab"} onClick={onClick} type="button">
      {children}
    </button>
  );
}

/* ===================== Premium UI ===================== */
function PremiumLock({ title }) {
  return (
    <div className="card" style={{ marginTop: 14, padding: 14, border: "1px dashed var(--border)" }}>
      <div className="row" style={{ justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900 }}>{title}</div>
          <div className="p-muted">
            Biểu đồ là tính năng Premium. Nâng cấp để xem trực quan và nhận insight nhanh.
          </div>
        </div>
        <button className="btn btn-primary" type="button">
          Nâng cấp premium
        </button>
      </div>
      <div
        style={{
          marginTop: 12,
          height: 220,
          borderRadius: 12,
          background: "rgba(0,0,0,0.04)",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      />
    </div>
  );
}

function TrendChart({ rows }) {
  const data = (rows || []).map((r) => ({ month: r.key, total: Number(r.total || 0) }));
  if (!data.length) return null;

  return (
    <div className="card" style={{ marginTop: 14, padding: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Xu hướng chi tiêu (6 tháng)</div>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => formatMoney(v)} />
            <Tooltip formatter={(v) => `${formatMoney(v)} VNĐ`} />
            <Line type="monotone" dataKey="total" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BreakdownChart({ rows }) {
  const sorted = [...(rows || [])].sort((a, b) => Number(b.total) - Number(a.total));
  const top = sorted.slice(0, 6);
  const rest = sorted.slice(6);
  const othersTotal = rest.reduce((s, r) => s + Number(r.total || 0), 0);

  const data = [
    ...top.map((r) => ({ name: r.category, total: Number(r.total || 0) })),
    ...(othersTotal > 0 ? [{ name: "Others", total: othersTotal }] : []),
  ];

  if (!data.length) return null;

  return (
    <div className="card" style={{ marginTop: 14, padding: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Chi tiêu theo loại (Top)</div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis tickFormatter={(v) => formatMoney(v)} />
            <Tooltip formatter={(v) => `${formatMoney(v)} VNĐ`} />
            <Bar dataKey="total" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="p-muted" style={{ marginTop: 8 }}>
        Top 6 + Others để tránh biểu đồ quá dài.
      </div>
    </div>
  );
}

function TopCategoriesChart({ rows, title = "Top categories (Bar chart)" }) {
  const data = (rows || []).map((r, idx) => ({
    name: r.category,
    total: Number(r.total || 0),
    rank: idx + 1,
  }));
  if (!data.length) return null;

  // màu theo rank (gọn & dễ đọc)
  const colors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#a855f7"];

  return (
    <div className="card" style={{ marginTop: 14, padding: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis tickFormatter={(v) => formatMoney(v)} />
            <Tooltip formatter={(v) => `${formatMoney(v)} VNĐ`} />
            <Bar dataKey="total">
              {data.map((_, idx) => (
                <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="p-muted" style={{ marginTop: 8 }}>
        Màu theo thứ hạng (Top 1 → Top 5).
      </div>
    </div>
  );
}

/* ===================== Comparison Gauge ===================== */
function ComparisonGauge({ comparison }) {
  const limit = Number(comparison?.limit || 0);
  const actual = Number(comparison?.actual || 0);
  const percent = Number(comparison?.percent || 0);
  const hasBudget = Boolean(comparison?.budget) && limit > 0;

  if (!hasBudget) return null;

  const band = percent >= 100 ? "danger" : percent >= 80 ? "warn" : "ok";
  const width = Math.min(100, Math.max(0, percent));

  const fill =
    band === "danger"
      ? "rgba(227, 93, 106, 0.85)"
      : band === "warn"
        ? "rgba(201, 195, 141, 0.95)"
        : "rgba(111, 174, 164, 0.95)";

  return (
    <div className="card" style={{ marginTop: 14, padding: 14 }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>Gauge: Budget Usage</div>
          <div className="p-muted">
            Chi tiêu {formatMoney(actual)} / Ngân sách {formatMoney(limit)} ({percent}%)
          </div>
        </div>
        <span className="tag">{band === "danger" ? "Over budget" : band === "warn" ? "Warning" : "OK"}</span>
      </div>

      <div style={{ marginTop: 12 }}>
        <div
          style={{
            height: 14,
            borderRadius: 999,
            background: "rgba(0,0,0,0.06)",
            overflow: "hidden",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ height: "100%", width: `${width}%`, borderRadius: 999, background: fill }} />
        </div>

        <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
          <div className="p-muted" style={{ fontSize: 12 }}>
            0%
          </div>
          <div className="p-muted" style={{ fontSize: 12 }}>
            80%
          </div>
          <div className="p-muted" style={{ fontSize: 12 }}>
            100%
          </div>
        </div>

        <div className="p-muted" style={{ marginTop: 8 }}>
          Mốc 80% là vùng cảnh báo; nên giữ dưới 80% để có buffer cho chi phí phát sinh.
        </div>
      </div>
    </div>
  );
}

/* ===================== Periodic Q1–Q4 Chart ===================== */
function PeriodicChart({ rows, year }) {
  const raw = rows || [];

  const getQuarter = (period) => {
    const s = String(period || "").toUpperCase();
    const m = s.match(/Q([1-4])/);
    if (m) return `Q${m[1]}`;
    return null;
  };

  const map = new Map([
    ["Q1", 0],
    ["Q2", 0],
    ["Q3", 0],
    ["Q4", 0],
  ]);

  raw.forEach((r) => {
    const q = getQuarter(r.period);
    if (!q) return;
    map.set(q, Number(r.total || 0));
  });

  const data = ["Q1", "Q2", "Q3", "Q4"].map((q) => ({ quarter: q, total: map.get(q) || 0 }));
  const hasAny = data.some((d) => d.total > 0);
  if (!hasAny) return null;

  const max = Math.max(...data.map((d) => d.total), 0);
  const getFill = (v) => {
    if (max <= 0) return "rgba(111, 174, 164, 0.9)";
    const ratio = v / max;
    if (ratio >= 0.75) return "rgba(227, 93, 106, 0.85)";
    if (ratio >= 0.45) return "rgba(201, 195, 141, 0.95)";
    return "rgba(111, 174, 164, 0.95)";
  };

  return (
    <div className="card" style={{ marginTop: 14, padding: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Chi tiêu theo quý ({year})</div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="quarter" />
            <YAxis tickFormatter={(v) => formatMoney(v)} />
            <Tooltip formatter={(v) => `${formatMoney(v)} VNĐ`} />
            <Bar dataKey="total">
              {data.map((d, idx) => (
                <Cell key={`cell-${idx}`} fill={getFill(d.total)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="p-muted" style={{ marginTop: 8 }}>
        Màu theo mức chi: xanh (thấp) → vàng (trung bình) → đỏ (cao).
      </div>
    </div>
  );
}

/* ===================== Page ===================== */
export default function ReportsPage() {
  const { accountType } = useOutletContext();
  const isPremium = accountType === "PREMIUM";

  const { month: nowMonth, year: nowYear } = monthStartYear();

  const [tab, setTab] = useState("breakdown");
  const [month, setMonth] = useState(nowMonth);
  const [year, setYear] = useState(nowYear);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState([]);

  const [breakdown, setBreakdown] = useState({ rows: [], grandTotal: 0 });
  const [comparison, setComparison] = useState({ budget: null, actual: 0, limit: 0, percent: 0 });
  const [trend, setTrend] = useState({ rows: [] });
  const [periodic, setPeriodic] = useState({ rows: [], year: nowYear });
  const [topCats, setTopCats] = useState({ rows: [] });

  const headerTitle = useMemo(() => {
    switch (tab) {
      case "breakdown":
        return "Thông số";
      case "comparison":
        return "Ngân sách và chi tiêu";
      case "trend":
        return "Xu hướng (6 tháng)";
      case "periodic":
        return "Chu kỳ (Quý)";
      case "analysis":
        return "Phân tích (Top categories)";
      default:
        return "Reports";
    }
  }, [tab]);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const cats = await fetchCategories();
      setCategories(cats || []);

      const [bd, comp, tr, per, top] = await Promise.all([
        getBreakdownByCategory({ month, year, categories: cats || [] }),
        getBudgetVsActual({ month, year }),
        getTrendLastNMonths({ n: 6 }),
        getPeriodicTotals({ year }),
        getTopCategories({ month, year, categories: cats || [], top: 5 }),
      ]);

      setBreakdown(bd);
      setComparison(comp);
      setTrend(tr);
      setPeriodic(per);
      setTopCats(top);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load reports.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const BannerComparison = () => {
    const { limit, actual, percent, budget } = comparison;

    if (!budget) {
      return (
        <div className="banner banner--neutral">
          <div className="banner__left">
            <div className="banner__title">Chưa có Ngân sách</div>
            <div className="banner__sub">
              Tạo ngân sách cho tháng này để so sánh Ngân sách vs Chi tiêu.
            </div>
          </div>
        </div>
      );
    }

    let cls = "banner banner--ok";
    let label = "Trong ngưỡng";
    if (percent >= 100) {
      cls = "banner banner--danger";
      label = "Vượt ngân sách";
    } else if (percent >= 80) {
      cls = "banner banner--warn";
      label = "Sắp vượt ngân sách";
    }

    return (
      <div className={cls}>
        <div className="banner__left">
          <div className="banner__title">{label}</div>
          <div className="banner__sub">
            Chi tiêu: {formatMoney(actual)} / Ngân sách: {formatMoney(limit)} ({percent}%)
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="pageWidth">
      <div className="card pad-lg">
        {/* Header */}
        <div className="dashHeader">
          <div>
            <div className="pageTitle">Báo cáo tài chính</div>
            <div className="dashDate">
              Tổng hợp báo cáo: Thông số, Ngân sách vs chi tiêu, xu hướng, Định kỳ và top chi phí.
            </div>
          </div>

          <div className="pageActions">
            <button className="btn" onClick={loadAll} disabled={loading}>
              Tải lại trang
            </button>
          </div>
        </div>

        {error ? <div className="alert">{error}</div> : null}

        {/* Filter bar */}
        <div className="toolbar" style={{ marginTop: 10 }}>
          <div className="toolbar__left">
            <div className="toolbar__group">
              <label className="label" style={{ margin: 0 }}>
                Month
              </label>
              <select className="input input--sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }).map((_, i) => {
                  const m = i + 1;
                  return (
                    <option key={m} value={m}>
                      {pad2(m)}
                    </option>
                  );
                })}
              </select>

              <label className="label" style={{ margin: 0 }}>
                Year
              </label>
              <input
                className="input input--sm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                inputMode="numeric"
                style={{ width: 110 }}
              />
            </div>
          </div>

          <div className="toolbar__right">
            <div className="stat">
              <div className="stat__label">Tổng tiền của tháng</div>
              <div className="stat__value">{formatMoney(breakdown.grandTotal)} VNĐ</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <Tab active={tab === "breakdown"} onClick={() => setTab("breakdown")}>
            Thông số
          </Tab>
          <Tab active={tab === "comparison"} onClick={() => setTab("comparison")}>
            So sánh
          </Tab>
          <Tab active={tab === "trend"} onClick={() => setTab("trend")}>
            Xu hướng
          </Tab>
          <Tab active={tab === "periodic"} onClick={() => setTab("periodic")}>
            Chu kỳ
          </Tab>
          <Tab active={tab === "analysis"} onClick={() => setTab("analysis")}>
            Xếp hạng
          </Tab>
        </div>

        {loading ? (
          <div className="skeleton">Loading reports…</div>
        ) : (
          <>
            <div className="reportHead">
              <div>
                <div className="reportTitle">{headerTitle}</div>
                <div className="p-muted">
                  Tháng {pad2(Number(month))}/{year}
                </div>
              </div>
            </div>

            {/* Breakdown */}
            {tab === "breakdown" ? (
              <>
                <div className="cards3" style={{ marginTop: 14 }}>
                  <div className="mini">
                    <div className="mini__label">Tổng tiền</div>
                    <div className="mini__value">{formatMoney(breakdown.grandTotal)} VNĐ</div>
                    <div className="mini__hint">Tổng chi theo tháng</div>
                  </div>
                  <div className="mini">
                    <div className="mini__label">Loại chi phí</div>
                    <div className="mini__value">{breakdown.rows.length}</div>
                    <div className="mini__hint">Số chi phí có phát sinh chi tiêu</div>
                  </div>
                  <div className="mini">
                    <div className="mini__label">Insight</div>
                    <div className="mini__value" style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
                      Breakdown giúp bạn thấy loại chi phí nào chiếm tỷ trọng lớn để tối ưu chi tiêu.
                    </div>
                  </div>
                </div>

                {isPremium ? <BreakdownChart rows={breakdown.rows} /> : <PremiumLock title="Biểu đồ Breakdown (Premium)" />}

                <div className="table-scroll" style={{ marginTop: 14 }}>
                  <div className="table-wrap">
                    <table className="table table__head-sticky">
                      <thead>
                        <tr>
                          <th style={{ width: 260 }}>Loại chi phí</th>
                          <th style={{ width: 260, textAlign: "center" }}>Tổng tiền</th>
                          <th style={{ width: 220, textAlign: "right" }}>Tỉ lệ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.rows.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="td-muted">
                              Không có dữ liệu tháng này.
                            </td>
                          </tr>
                        ) : (
                          breakdown.rows.map((r) => {
                            const share =
                              breakdown.grandTotal > 0
                                ? Math.round((Number(r.total || 0) / breakdown.grandTotal) * 100)
                                : 0;
                            return (
                              <tr key={r.category_id}>
                                <td>{r.category}</td>
                                <td className="mono" style={{ textAlign: "center", fontWeight: 900 }}>
                                  {formatMoney(r.total)} VNĐ
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <span className="tag">{share}%</span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            {/* Comparison */}
            {tab === "comparison" ? (
              <>
                <BannerComparison />

                {isPremium ? <ComparisonGauge comparison={comparison} /> : <PremiumLock title="Gauge Budget Usage (Premium)" />}

                <div className="cards3" style={{ marginTop: 14 }}>
                  <div className="mini">
                    <div className="mini__label">Ngân sách</div>
                    <div className="mini__value">{comparison.limit ? formatMoney(comparison.limit) : "—"} VNĐ</div>
                    <div className="mini__hint">Ngân sách tháng</div>
                  </div>
                  <div className="mini">
                    <div className="mini__label">Chi tiêu</div>
                    <div className="mini__value">{formatMoney(comparison.actual)} VNĐ</div>
                    <div className="mini__hint">Tổng chi thực tế</div>
                  </div>
                  <div className="mini">
                    <div className="mini__label">Mức độ sử dụng</div>
                    <div className="mini__value">{comparison.limit ? `${comparison.percent}%` : "—"}</div>
                    <div className="progress">
                      <div className="progress__bar" style={{ width: `${Math.min(100, comparison.percent)}%` }} />
                    </div>
                    <div className="mini__hint">Tỷ lệ sử dụng ngân sách</div>
                  </div>
                </div>

                <div className="table-scroll" style={{ marginTop: 14 }}>
                  <div className="table-wrap">
                    <table className="table table__head-sticky">
                      <thead>
                        <tr>
                          <th style={{ width: 220 }}>Thời gian</th>
                          <th style={{ width: 220 }}>Ngân sách</th>
                          <th style={{ width: 220 }}>Chi tiêu</th>
                          <th>Mức độ</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="mono">
                            {pad2(Number(month))}/{year}
                          </td>
                          <td className="mono" style={{ fontWeight: 900 }}>
                            {comparison.limit ? formatMoney(comparison.limit) : "—"}
                          </td>
                          <td className="mono" style={{ fontWeight: 900 }}>
                            {formatMoney(comparison.actual)}
                          </td>
                          <td className="td-muted">
                            {comparison.limit
                              ? comparison.percent >= 100
                                ? "Over budget"
                                : comparison.percent >= 80
                                  ? "Warning"
                                  : "OK"
                              : "No budget configured"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            {/* Trend */}
            {tab === "trend" ? (
              <>
                <div className="cards3" style={{ marginTop: 14 }}>
                  <div className="mini">
                    <div className="mini__label">Xu hướng</div>
                    <div className="mini__value">6 tháng</div>
                    <div className="mini__hint">Xu hướng chi tiêu gần đây</div>
                  </div>
                  <div className="mini">
                    <div className="mini__label">Tháng gần nhất</div>
                    <div className="mini__value">
                      {trend.rows.length ? formatMoney(trend.rows[trend.rows.length - 1].total) : "—"} VNĐ
                    </div>
                    <div className="mini__hint">Tổng chi tháng gần nhất</div>
                  </div>
                  <div className="mini">
                    <div className="mini__label">Insight</div>
                    <div className="mini__value" style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
                      Nếu xu hướng tăng liên tục, cân nhắc giới hạn chi theo loại chi phí hoặc tăng ngân sách hợp lý.
                    </div>
                  </div>
                </div>

                {isPremium ? <TrendChart rows={trend.rows} /> : <PremiumLock title="Biểu đồ Trend (Premium)" />}

                <div className="table-scroll" style={{ marginTop: 14 }}>
                  <div className="table-wrap">
                    <table className="table table__head-sticky">
                      <thead>
                        <tr>
                          <th style={{ width: 220 }}>Tháng</th>
                          <th style={{ width: 260, textAlign: "right" }}>Tổng tiền</th>
                          <th>Chỉ số</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trend.rows.map((r) => {
                          const max = Math.max(1, ...trend.rows.map((x) => Number(x.total || 0)));
                          const pct = Math.min(100, (Number(r.total || 0) / max) * 100);
                          return (
                            <tr key={r.key}>
                              <td className="mono">{r.key}</td>
                              <td className="mono" style={{ textAlign: "right", fontWeight: 900 }}>
                                {formatMoney(r.total)} VNĐ
                              </td>
                              <td className="td-muted">
                                <div className="spark">
                                  <div className="spark__bar" style={{ width: `${pct}%` }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            {/* Periodic */}
            {tab === "periodic" ? (
              <>
                <div className="cards3" style={{ marginTop: 14 }}>
                  <div className="mini">
                    <div className="mini__label">Năm</div>
                    <div className="mini__value">{periodic.year}</div>
                    <div className="mini__hint">Tổng hợp theo quý</div>
                  </div>
                  <div className="mini">
                    <div className="mini__label">Tổng năm</div>
                    <div className="mini__value">
                      {formatMoney(periodic.rows.reduce((s, r) => s + Number(r.total || 0), 0))} VNĐ
                    </div>
                    <div className="mini__hint">Tổng chi cả năm</div>
                  </div>
                  <div className="mini">
                    <div className="mini__label">Insight</div>
                    <div className="mini__value" style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
                      Periodic report hữu ích để so sánh các quý và đánh giá biến động dài hạn.
                    </div>
                  </div>
                </div>

                {isPremium ? <PeriodicChart rows={periodic.rows} year={periodic.year} /> : <PremiumLock title="Biểu đồ Q1–Q4 (Premium)" />}

                <div className="table-scroll" style={{ marginTop: 14 }}>
                  <div className="table-wrap">
                    <table className="table table__head-sticky">
                      <thead>
                        <tr>
                          <th style={{ width: 220 }}>Thời gian</th>
                          <th style={{ width: 260, textAlign: "right" }}>Tổng tiền</th>
                          <th style={{ width: 260, textAlign: "center" }}>Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody>
                        {periodic.rows.map((r) => (
                          <tr key={r.period}>
                            <td className="mono">{r.period}</td>
                            <td className="mono" style={{ textAlign: "right", fontWeight: 900 }}>
                              {formatMoney(r.total)} VNĐ
                            </td>
                            <td className="td-muted" style={{ textAlign: "center" }}>
                              —
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            {/* Analysis */}
            {tab === "analysis" ? (
              <>
                <div className="cards3" style={{ marginTop: 14 }}>
                  <div className="mini">
                    <div className="mini__label">Top</div>
                    <div className="mini__value">5</div>
                    <div className="mini__hint">Loại chi phí tốn tiền nhất</div>
                  </div>
                  <div className="mini">
                    <div className="mini__label">Tổng tiền tháng</div>
                    <div className="mini__value">{formatMoney(breakdown.grandTotal)} VNĐ</div>
                    <div className="mini__hint">Tổng chi tháng</div>
                  </div>
                  <div className="mini">
                    <div className="mini__label">Insight</div>
                    <div className="mini__value" style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
                      Tập trung tối ưu top categories thường mang lại hiệu quả tiết kiệm lớn nhất.
                    </div>
                  </div>
                </div>

                {isPremium ? <TopCategoriesChart rows={topCats.rows} title="Top 5 categories (Bar chart)" /> : <PremiumLock title="Biểu đồ Top 5 (Premium)" />}

                <div className="table-scroll" style={{ marginTop: 14 }}>
                  <div className="table-wrap">
                    <table className="table table__head-sticky">
                      <thead>
                        <tr>
                          <th style={{ width: 260 }}>Loại chi phí</th>
                          <th style={{ width: 260, textAlign: "center" }}>Tổng tiền</th>
                          <th style={{ width: 220, textAlign: "right" }}>Xếp hạng</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCats.rows.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="td-muted">
                              Không có dữ liệu tháng này.
                            </td>
                          </tr>
                        ) : (
                          topCats.rows.map((r, idx) => (
                            <tr key={r.category_id}>
                              <td>{r.category}</td>
                              <td className="mono" style={{ textAlign: "center", fontWeight: 900 }}>
                                {formatMoney(r.total)} VNĐ
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <span className="tag">#{idx + 1}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
