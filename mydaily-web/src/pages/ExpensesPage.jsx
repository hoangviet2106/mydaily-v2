import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import { fetchCategories } from "../api/categories";
import { createExpense, deleteExpense, fetchExpenses, updateExpense } from "../api/expenses";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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

function AlertBanner({ alert }) {
  if (!alert) return null;

  const { status, totalExpense, budgetLimit, percentUsed, month, year } = alert;

  const meta =
    status === "NO_BUDGET"
      ? `Chưa có budget cho ${pad2(month)}/${year}. Tổng chi: ${formatMoney(totalExpense)}`
      : `Tháng ${pad2(month)}/${year}: ${formatMoney(totalExpense)} / ${formatMoney(
          budgetLimit
        )} (${percentUsed ?? 0}%)`;

  const cls =
    status === "OVER"
      ? "banner banner--danger"
      : status === "WARNING"
      ? "banner banner--warn"
      : status === "OK"
      ? "banner banner--ok"
      : "banner";

  const label =
    status === "OVER"
      ? "Vượt ngân sách"
      : status === "WARNING"
      ? "Sắp vượt ngân sách"
      : status === "OK"
      ? "Trong ngưỡng"
      : "Chưa thiết lập budget";

  return (
    <div className={cls}>
      <div className="banner__left">
        <div className="banner__title">{label}</div>
        <div className="banner__sub">{meta}</div>
      </div>
    </div>
  );
}

function ExpenseForm({ mode, categories, initialValue, submitting, onSubmit, onCancel }) {
  const [amount, setAmount] = useState(initialValue?.amount ? String(initialValue.amount) : "");
  const [expenseDate, setExpenseDate] = useState(
    initialValue?.expense_date ? initialValue.expense_date.slice(0, 10) : todayISO()
  );
  const [categoryId, setCategoryId] = useState(initialValue?.category_id || "");
  const [note, setNote] = useState(initialValue?.note || "");
  const [err, setErr] = useState("");

  useEffect(() => {
    setAmount(initialValue?.amount ? String(initialValue.amount) : "");
    setExpenseDate(initialValue?.expense_date ? initialValue.expense_date.slice(0, 10) : todayISO());
    setCategoryId(initialValue?.category_id || "");
    setNote(initialValue?.note || "");
    setErr("");
  }, [initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr("");

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return setErr("Amount phải là số > 0.");
    if (!expenseDate) return setErr("Vui lòng chọn ngày.");
    if (!categoryId) return setErr("Vui lòng chọn category.");

    onSubmit?.({
      amount: n,
      expense_date: expenseDate, // yyyy-mm-dd (backend zod coerce date OK)
      category_id: categoryId,
      note: note?.trim() ? note.trim() : null,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid2">
        <div className="field">
          <label className="label">Số tiền</label>
          <input
            className="input"
            inputMode="decimal"
            placeholder="Ví dụ: 50000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <div className="hint">Hiển thị: {formatMoney(amount)}</div>
        </div>

        <div className="field">
          <label className="label">Ngày chi</label>
          <input
            className="input"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label className="label">Loại chi tiêu</label>
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">-- Chọn loại --</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label className="label">Ghi chú (chi tiết)</label>
        <textarea
          className="input"
          rows={3}
          placeholder="Ghi chú chi tiêu…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {err ? <div className="alert">{err}</div> : null}

      <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
        <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : mode === "edit" ? "Update expense" : "Add expense"}
        </button>
      </div>
    </form>
  );
}

export default function ExpensesPage() {
  const { month: nowMonth, year: nowYear } = monthStartYear();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState([]);
  const [expenses, setExpenses] = useState([]);

  // filters
  const [month, setMonth] = useState(nowMonth);
  const [year, setYear] = useState(nowYear);
  const [categoryId, setCategoryId] = useState("");
  const [q, setQ] = useState("");

  // alert from backend (after mutations)
  const [alert, setAlert] = useState(null);

  // modal
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const catMap = useMemo(() => {
    const m = new Map();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return expenses.filter((e) => {
      const my = toMonthYear(e.expense_date);
      if (my.month !== Number(month) || my.year !== Number(year)) return false;
      if (categoryId && e.category_id !== categoryId) return false;
      if (query) {
        const note = (e.note || "").toLowerCase();
        const catName = (catMap.get(e.category_id)?.name || "").toLowerCase();
        if (!note.includes(query) && !catName.includes(query)) return false;
      }
      return true;
    });
  }, [expenses, month, year, categoryId, q, catMap]);

  const total = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount || 0), 0), [filtered]);

  const breakdown = useMemo(() => {
    const sums = new Map();
    for (const e of filtered) {
      sums.set(e.category_id, (sums.get(e.category_id) || 0) + Number(e.amount || 0));
    }
    const rows = [...sums.entries()]
      .map(([cid, amt]) => ({
        cid,
        name: catMap.get(cid)?.name || "Unknown",
        amt,
      }))
      .sort((a, b) => b.amt - a.amt)
      .slice(0, 4);

    return rows;
  }, [filtered, catMap]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [cats, exps] = await Promise.all([fetchCategories(), fetchExpenses()]);
      setCategories(cats || []);
      setExpenses(exps || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load expenses.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      await load();
      if (!alive) return;
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (exp) => {
    setMode("edit");
    setEditing(exp);
    setOpen(true);
  };

  const handleSave = async (payload) => {
    setSubmitting(true);
    try {
      if (mode === "edit" && editing?.id) {
        const res = await updateExpense(editing.id, payload);
        setExpenses((prev) => prev.map((x) => (x.id === editing.id ? res.expense : x)));
        setAlert(res.alert || null);
      } else {
        const res = await createExpense(payload);
        setExpenses((prev) => [res.expense, ...prev]);
        setAlert(res.alert || null);
      }
      setOpen(false);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Save failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (exp) => {
    const ok = window.confirm("Delete expense này?");
    if (!ok) return;

    setError("");
    try {
      const res = await deleteExpense(exp.id);
      setExpenses((prev) => prev.filter((x) => x.id !== exp.id));
      setAlert(res.alert || null);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Delete failed.";
      setError(msg);
    }
  };

  return (
    <div className="pageWidth">
      <div className="card pad-lg">
        {/* Header */}
        <div className="dashHeader">
          <div>
            <div className="pageTitle">Expenses</div>
            <div className="dashDate">Quản lý chi tiêu theo tháng, category và ghi chú.</div>
          </div>

          <div className="pageActions">
            <button className="btn" onClick={load} disabled={loading}>
              Tải lại trang
            </button>
            <button className="btn btn-primary" onClick={openCreate}>
              + Thêm mới chi tiêu
            </button>
          </div>
        </div>

        <AlertBanner alert={alert} />

        {error ? <div className="alert">{error}</div> : null}

        <div className="toolbar">
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
                Loại
              </label>
              <select
                className="input input--sm"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ minWidth: 200 }}
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                className="input input--sm"
                placeholder="Tìm kiếm..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ minWidth: 220 }}
              />
            </div>
          </div>

          <div className="toolbar__right">
            <div className="stat">
              <div className="stat__label">Tổng tiền</div>
              <div className="stat__value">{formatMoney(total)} VNĐ</div>
            </div>
            <div className="stat">
              <div className="stat__label">Số lượng</div>
              <div className="stat__value">{filtered.length}</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="skeleton">Loading expenses…</div>
        ) : filtered.length === 0 ? (
          <div className="empty" style={{ marginTop: 12 }}>
            <div>
              <div className="empty__title">Chưa có giao dịch trong tháng này</div>
              <div className="empty__subtitle">Thử đổi Tháng/Năm, Loại chi phí hoặc tạo chi phí mới.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="cards3" style={{ marginTop: 14 }}>
              <div className="mini">
                <div className="mini__label">Tháng</div>
                <div className="mini__value">
                  {pad2(Number(month))}/{year}
                </div>
              </div>

              <div className="mini">
                <div className="mini__label">Xếp hạng</div>
                <div className="mini__value" style={{ fontSize: 13, fontWeight: 800 }}>
                  {breakdown.length ? (
                    breakdown.map((x) => (
                      <div key={x.cid} className="mini__row">
                        <span className="tag">{x.name}</span>
                        <span className="mono">{formatMoney(x.amt)}</span>
                      </div>
                    ))
                  ) : (
                    <span className="p-muted">—</span>
                  )}
                </div>
              </div>

              <div className="mini">
                <div className="mini__label">Quick tips</div>
                <div className="mini__value" style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
                  Gợi ý: tạo Budget để hệ thống cảnh báo sắp/vượt ngân sách sau mỗi lần nhập chi.
                </div>
              </div>
            </div>

            {/* ✅ FIX: single scroll + sticky header works */}
            <div className="table-scroll" style={{ marginTop: 14 }}>
              <div className="table-wrap">
                <table className="table table__head-sticky">
                  <thead>
                    <tr>
                      <th style={{ width: 140 }}>Thời gian</th>
                      <th style={{ width: 140 }}>Loại</th>
                      <th>Ghi chú</th>
                      <th style={{ width: 160, textAlign: "right" }}>Tổng tiền</th>
                      <th style={{ width: 180, textAlign: "right" }}>Hành động</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.map((e) => (
                      <tr key={e.id}>
                        <td className="mono">{e.expense_date.slice(0, 10)}</td>
                        <td>{catMap.get(e.category_id)?.name || "Unknown"}</td>
                        <td className="td-muted">{e.note || "—"}</td>
                        <td className="mono" style={{ textAlign: "right", fontWeight: 900 }}>
                          {formatMoney(e.amount)} VNĐ
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="row" style={{ justifyContent: "flex-end" }}>
                            <button className="btn btn-sm" onClick={() => openEdit(e)}>
                              Chỉnh Sửa
                            </button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(e)}>
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <Modal
          open={open}
          title={mode === "edit" ? "Edit expense" : "Add expense"}
          onClose={() => (submitting ? null : setOpen(false))}
          footer={null}
        >
          <ExpenseForm
            mode={mode}
            categories={categories}
            initialValue={editing}
            submitting={submitting}
            onSubmit={handleSave}
            onCancel={() => setOpen(false)}
          />
        </Modal>
      </div>
    </div>
  );
}
