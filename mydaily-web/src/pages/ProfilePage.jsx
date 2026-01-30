import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

function fmtDateTime(d) {
  if (!d) return "—";
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return "—";
  return x.toLocaleString("vi-VN");
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [me, setMe] = useState(null);
  const [name, setName] = useState("");

  const accountType = useMemo(() => {
    const raw =
      me?.account_type ??
      me?.accountType ??
      me?.plan ??
      me?.tier ??
      me?.subscription ??
      (typeof me?.is_premium === "boolean" ? (me.is_premium ? "PREMIUM" : "FREE") : undefined);
    return raw ? String(raw).toUpperCase() : "FREE";
  }, [me]);

  const load = async () => {
    setLoading(true);
    setErr("");
    setOk("");
    try {
      // backend của bạn: GET /users/me -> { user }
      const res = await api.get("/users/me");
      const user = res.data?.user ?? res.data ?? null;
      setMe(user);
      setName(user?.name || "");
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to load profile."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    setErr("");
    setOk("");

    const v = String(name || "").trim();
    if (!v) return setErr("Tên hiển thị không được để trống.");
    if (v.length < 2) return setErr("Tên hiển thị phải >= 2 ký tự.");
    if (v.length > 100) return setErr("Tên hiển thị tối đa 100 ký tự.");

    setSaving(true);
    try {
      // IMPORTANT: bạn cần tạo endpoint update name (mình ghi theo chuẩn)
      // PATCH /users/me { name }
      const res = await api.patch("/users/me", { name: v });

      const user = res.data?.user ?? res.data ?? null;
      setMe(user || { ...me, name: v });
      setName((user?.name ?? v) || v);
      setOk("Đã lưu thay đổi.");
    } catch (e) {
      setErr(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          "Save failed."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container reportWide">
      {/* Header */}
      <div className="topbar">
        <div>
          <div className="h1">Profile</div>
          <div className="p-muted">Xem và chỉnh sửa thông tin tài khoản.</div>
        </div>

        <div className="toolbar__right">
          <button className="btn" type="button" onClick={load} disabled={loading}>
            {loading ? "Đang tải..." : "Tải lại"}
          </button>
        </div>
      </div>

      {err ? <div className="alert">{err}</div> : null}
      {ok ? <div className="banner banner--ok">{ok}</div> : null}

      {loading ? (
        <div className="skeleton">Loading profile…</div>
      ) : !me ? (
        <div className="empty" style={{ marginTop: 12 }}>
          <div>
            <div className="empty__title">Không tải được profile</div>
            <div className="empty__subtitle">Hãy thử “Tải lại” hoặc đăng nhập lại.</div>
          </div>
        </div>
      ) : (
        <>
          {/* Summary cards (đồng nhất kiểu cards3) */}
          <div className="cards3" style={{ marginTop: 12 }}>
            <div className="mini">
              <div className="mini__label">Account Type</div>
<div
      className={`planBadge ${
        accountType === "PREMIUM" ? "planBadge--premium" : "planBadge--free"
      }`}
      style={{ marginTop: 6 }}
    >
      <span className="planBadge__dot" />
      <span className="planBadge__text">
        {accountType === "PREMIUM" ? "Premium Plan" : "Free Plan"}
      </span>
      {accountType === "PREMIUM" && <span className="planBadge__icon">👑</span>}
    </div>
              <div className="mini__hint">Gói hiện tại</div>
            </div>

            <div className="mini">
              <div className="mini__label">Email</div>
              <div className="mini__value" style={{ fontSize: 14, fontWeight: 900 }}>
                {me.email || "—"}
              </div>
              <div className="mini__hint">Email đăng nhập</div>
            </div>

            <div className="mini">
              <div className="mini__label">Created</div>
              <div className="mini__value mono">{fmtDateTime(me.created_at || me.createdAt)}</div>
              <div className="mini__hint">Ngày tạo tài khoản</div>
            </div>
          </div>

          {/* Form card (gọn, không “quá to”) */}
          <div className="card pad-lg" style={{ marginTop: 12 }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0 }}>Thông tin hiển thị</h3>
                {/* <div className="p-muted">Tên này sẽ hiển thị ở phần “Xin chào …” trên Dashboard.</div> */}
              </div>
              <button className="btn btn-primary" onClick={onSave} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div className="field">
                <label className="label">Tên hiển thị</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Andrea, Admin, ..."
                />
                <div className="hint">Gợi ý: dùng tên ngắn, dễ đọc.</div>
              </div>

              {/* Email readonly (tuỳ bạn có muốn show ở form nữa không) */}
              <div className="field">
                <label className="label">Email (readonly)</label>
                <input className="input" value={me.email || ""} readOnly />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
