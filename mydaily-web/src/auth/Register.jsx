import { useState } from "react";
import api from "../api/axios";

export default function Register() {
  const [name, setName] = useState("Test User");
  const [email, setEmail] = useState("testnew@test.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/register", { name, email, password });
      localStorage.setItem("token", res.data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card pad-lg" style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ marginBottom: 14 }}>
          <h1 className="h1">Tạo tài khoản</h1>
          <p className="p-muted">Bắt đầu quản lý công việc và chi tiêu ngay hôm nay.</p>
        </div>

        <div style={{ height: 1, background: "rgba(227,233,231,0.9)", margin: "16px 0" }} />

        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label className="label">Tên</label>
            <input
              className="input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="field">
            <label className="label">Email</label>
            <input
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label className="label">Mật Khẩu</label>
            <input
              className="input"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="field">
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </button>
          </div>

          {error && <div className="alert">{error}</div>}

          <p className="p-muted" style={{ marginTop: 12 }}>
            Bạn đã có tài khoản?{" "} <Link to="/login">Sign in</Link>

            <a href="/login" style={{ color: "var(--primary-dark)", fontWeight: 700 }}>
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
