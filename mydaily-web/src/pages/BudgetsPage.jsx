import { useEffect, useMemo, useState } from "react";
import { fetchExpenses } from "../api/expenses";
import { fetchBudgetByMonthYear, upsertBudget } from "../api/budgets";

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
function toMonthYear(dateStr) {
  const d = new Date(dateStr);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function BudgetStatus({ budget, actual }) {
  const limit = Number(budget?.limit_amount || 0);
  const spent = Number(actual || 0);

  if (!budget) {
    return (
      <div className="banner banner--neutral">
        <div className="banner__left">
          <div className="banner__title">Chưa thiết lập ngân sách</div>
          <div className="banner__sub">
            Bạn có thể tạo Budget cho tháng này để hệ thống cảnh báo khi chi tiêu tăng cao.
          </div>
        </div>
      </div>
    );
  }

  const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;

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
          Tổng chi: {formatMoney(spent)} / Budget: {formatMoney(limit)} ({percent}%)
        </div>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const { month: nowMonth, year: nowYear } = monthStartYear();

  const [month, setMonth] = useState(nowMonth);
  const [year, setYear] = useState(nowYear);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [budget, setBudget] = useState(null); // { id, month, year, limit_amount, ... }
  const [draftAmount, setDraftAmount] = useState("");

  const [expenses, setExpenses] = useState([]);

  const actual = useMemo(() => {
    return expenses
      .filter((e) => {
        const my = toMonthYear(e.expense_date);
        return my.month === Number(month) && my.year === Number(year);
      })
      .reduce((s, e) => s + Number(e.amount || 0), 0);
  }, [expenses, month, year]);

  const remaining = useMemo(() => {
    const limit = Number(budget?.limit_amount || 0);
    return Math.max(limit - actual, 0);
  }, [budget, actual]);

  const percentUsed = useMemo(() => {
    const limit = Number(budget?.limit_amount || 0);
    if (!budget || limit <= 0) return 0;
    return Math.min(100, Math.round((actual / limit) * 100));
  }, [budget, actual]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [exps, b] = await Promise.all([fetchExpenses(), fetchBudgetByMonthYear(month, year)]);
      setExpenses(exps || []);

      // GET /budgets trả thẳng budget object hoặc null
      const normalized = b?.budget ?? b?.data ?? b ?? null;

      const amt =
        normalized?.limit_amount ??
        normalized?.amount ??
        normalized?.limit ??
        normalized?.budget_limit ??
        normalized?.budgetLimit ??
        null;

      setBudget(normalized ? { ...normalized, limit_amount: amt } : null);
      setDraftAmount(amt !== null && amt !== undefined ? String(amt) : "");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load budgets.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const onSave = async () => {
    setError("");
    const trimmed = String(draftAmount ?? "").trim();
    const n = Number(trimmed);

    if (!trimmed || !Number.isFinite(n) || n <= 0) {
      setError("Budget amount phải là số > 0.");
      return;
    }

    setSaving(true);
    try {
      const res = await upsertBudget({
        month: Number(month),
        year: Number(year),
        limit_amount: n,
      });

      const normalized = res?.budget ?? res?.data ?? res ?? null;

      const amt =
        normalized?.limit_amount ??
        normalized?.amount ??
        normalized?.limit ??
        normalized?.budget_limit ??
        normalized?.budgetLimit ??
        n;

      setBudget(normalized ? { ...normalized, limit_amount: amt } : { month, year, limit_amount: amt });
      setDraftAmount(String(amt));
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Save budget failed.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const onResetDraft = () => {
    setDraftAmount(
      budget?.limit_amount !== undefined && budget?.limit_amount !== null ? String(budget.limit_amount) : ""
    );
    setError("");
  };

  return (
    <div className="pageWidth">
      <div className="card pad-lg">
        {/* Header */}
        <div className="dashHeader">
          <div>
            <div className="pageTitle">Budgets</div>
            <div className="dashDate">
              Thiết lập ngân sách theo tháng và theo dõi Ngân sách vs Chi tiêu.
            </div>
          </div>

          <div className="pageActions">
            <button className="btn" onClick={load} disabled={loading}>
              Tải lại trang
            </button>
          </div>
        </div>

        {error ? <div className="alert">{error}</div> : null}

        {/* Filters + Editor */}
        <div className="toolbar" style={{ marginTop: 10 }}>
          <div className="toolbar__left">
            <div className="toolbar__group">
              <label className="label" style={{ margin: 0 }}>
                Month
              </label>
              <select className="input input--sm" value={month} onChange={(e) => setMonth(e.target.value)}>
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
                onChange={(e) => setYear(e.target.value)}
                inputMode="numeric"
                style={{ width: 110 }}
              />
            </div>

            <div className="toolbar__group">
              <label className="label" style={{ margin: 0 }}>
                Ngân sách
              </label>
              <input
                className="input input--sm"
                placeholder="Ví dụ: 3000000"
                value={draftAmount}
                onChange={(e) => setDraftAmount(e.target.value)}
                inputMode="numeric"
                style={{ width: 220 }}
              />

              <button className="btn btn-primary" onClick={onSave} disabled={saving || loading}>
                {saving ? "Saving…" : budget ? "Cập nhật ngân sách" : "Tạo ngân sách mới"}
              </button>

              <button className="btn" onClick={onResetDraft} disabled={saving || loading}>
                Cài lại
              </button>
            </div>
          </div>

          <div className="toolbar__right">
            <div className="stat">
              <div className="stat__label">Chi tiêu</div>
              <div className="stat__value">{formatMoney(actual)} VNĐ</div>
            </div>
            <div className="stat">
              <div className="stat__label">Còn lại</div>
              <div className="stat__value">{formatMoney(remaining)} VNĐ</div>
            </div>
          </div>
        </div>

        <BudgetStatus budget={budget} actual={actual} />

        {loading ? (
          <div className="skeleton">Loading budget…</div>
        ) : (
          <>
            <div className="cards3" style={{ marginTop: 14 }}>
              <div className="mini">
                <div className="mini__label">Ngân sách</div>
                <div className="mini__value">{budget ? formatMoney(budget.limit_amount) : "—"}</div>
                <div className="mini__hint">
                  Ngân sách của tháng {pad2(Number(month))}/{year}
                </div>
              </div>

              <div className="mini">
                <div className="mini__label">Sử dụng</div>
                <div className="mini__value">{budget ? `${percentUsed}%` : "—"}</div>

                <div className="progress" aria-label="Budget usage">
                  <div className="progress__bar" style={{ width: `${percentUsed}%` }} />
                </div>

                <div className="mini__hint">Tỷ lệ sử dụng ngân sách</div>
              </div>

              <div className="mini">
                <div className="mini__label">Action</div>
                <div className="mini__value" style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
                  Gợi ý: nếu chi tiêu tháng này biến động mạnh, hãy cập nhật budget để phản ánh thực tế.
                </div>
              </div>
            </div>

            {/* Table (gọn + scroll đúng system) */}
            <div className="table-scroll" style={{ marginTop: 14 }}>
              <div className="table-wrap">
                <table className="table table__head-sticky">
                  <thead>
                    <tr>
                      <th style={{ width: 220 }}>Thời gian</th>
                      <th style={{ width: 200 }}>Ngân sách</th>
                      <th style={{ width: 200 }}>Chi tiêu</th>
                      <th style={{ width: 200 }}>Còn lại</th>
                      <th>Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="mono">
                        {pad2(Number(month))}/{year}
                      </td>
                      <td className="mono" style={{ fontWeight: 900 }}>
                        {budget ? formatMoney(budget.limit_amount) : "—"}
                      </td>
                      <td className="mono" style={{ fontWeight: 900 }}>
                        {formatMoney(actual)}
                      </td>
                      <td className="mono" style={{ fontWeight: 900 }}>
                        {budget ? formatMoney(Math.max(Number(budget.limit_amount || 0) - actual, 0)) : "—"}
                      </td>
                      <td className="td-muted">
                        {budget ? "Bạn có thể chỉnh budget ở ô phía trên." : "Chưa có budget, hãy tạo để theo dõi chi tiêu."}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
