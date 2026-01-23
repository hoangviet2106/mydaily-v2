import { useEffect, useMemo, useState } from "react";
import Modal from "../components/Modal";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from "../api/category";

function CategoryForm({ mode, initialValue, submitting, onSubmit, onCancel }) {
  const [name, setName] = useState(initialValue?.name || "");
  const [err, setErr] = useState("");

  useEffect(() => {
    setName(initialValue?.name || "");
    setErr("");
  }, [initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr("");

    const v = String(name || "").trim();
    if (!v) return setErr("Tên category không được để trống.");
    if (v.length < 2) return setErr("Tên category phải >= 2 ký tự.");

    onSubmit?.({ name: v });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label className="label">Tên loại chi phí</label>
        <input
          className="input"
          placeholder="Ví dụ: Food, Transport, Bills..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <div className="hint">Gợi ý: dùng tên ngắn, nhất quán để báo cáo đẹp hơn.</div>
      </div>

      {err ? <div className="alert">{err}</div> : null}

      <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
        <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
          Hủy
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Saving…" : mode === "edit" ? "Cập nhật" : "Thêm mới"}
        </button>
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((c) => String(c.name || "").toLowerCase().includes(query));
  }, [items, q]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchCategories();
      setItems(data || []);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to load categories.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (cat) => {
    setMode("edit");
    setEditing(cat);
    setOpen(true);
  };

  const onSave = async (payload) => {
    setSubmitting(true);
    setError("");
    try {
      if (mode === "edit" && editing?.id) {
        const updated = await updateCategory(editing.id, payload);
        setItems((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
      } else {
        const created = await createCategory(payload);
        setItems((prev) => [created, ...prev]);
      }
      setOpen(false);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Save category failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (cat) => {
    const ok = window.confirm(`Xóa category "${cat.name}"?`);
    if (!ok) return;

    setError("");
    try {
      await deleteCategory(cat.id);
      setItems((prev) => prev.filter((x) => x.id !== cat.id));
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Delete category failed.";
      setError(msg);
    }
  };

  return (
    <div className="card pad-lg categoryWide">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0 }}>Categories</h3>
          <p className="p-muted">
            Quản lý danh mục chi tiêu để nhập liệu nhanh và báo cáo chính xác.
          </p>
        </div>

        <div className="row">
          <button className="btn" onClick={load} disabled={loading}>
            Tải lại trang
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            + Thêm mới
          </button>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="toolbar" style={{ marginTop: 10 }}>
        <div className="toolbar__left">
          <div className="toolbar__group">
            <label className="label" style={{ margin: 0 }}>
              Search
            </label>
            <input
              className="input input--sm"
              placeholder="Tìm theo tên category…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 280 }}
            />
          </div>
        </div>

        <div className="toolbar__right">
          <div className="stat">
            <div className="stat__label">Số lượng</div>
            <div className="stat__value">{items.length}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Khớp</div>
            <div className="stat__value">{filtered.length}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton">Loading categories…</div>
      ) : filtered.length === 0 ? (
        <div className="empty" style={{ marginTop: 12 }}>
          <div className="empty__icon">#</div>
          <div>
            <div className="empty__title">No categories</div>
            <div className="empty__subtitle">Tạo category mới để bắt đầu nhập chi tiêu.</div>
          </div>
        </div>
      ) : (
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 160 }}>Tên loại chi phí</th>
                <th style={{ width: 140, textAlign: "right" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 900 }}>{c.name}</td>
                  <td style={{ textAlign: "right" }}>
                    <div className="row" style={{ justifyContent: "flex-end" }}>
                      <button className="btn btn-sm" onClick={() => openEdit(c)}>
                        Chỉnh sửa
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => onDelete(c)}>
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        title={mode === "edit" ? "Edit category" : "Add category"}
        onClose={() => (submitting ? null : setOpen(false))}
      >
        <CategoryForm
          mode={mode}
          initialValue={editing}
          submitting={submitting}
          onSubmit={onSave}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}
