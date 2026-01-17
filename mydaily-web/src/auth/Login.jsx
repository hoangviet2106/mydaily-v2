import { useState } from "react";
import api from "../api/axios";
import logo from "../assets/mydailylogo.png";
import { Link } from "react-router-dom";



export default function Login() {
  const [email, setEmail] = useState("test3@test.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
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
    <div className="page">
      <div className="card pad-lg" style={{ width: "100%", maxWidth: 520 }}>
        <div className="brand">
          

          <img src={logo} alt="MyDaily logo" className="brand__logo-img" />
          
        </div>
                  <div>
            <p className="brand__subtitle">Hỗ trợ cuộc sống thông minh</p>
            
          </div>

        <div style={{ marginTop: 14 }}>
          <h1 className="h1">Đăng nhập</h1>
          <p className="p-muted">Gói gọn công việc và tài chính trong một tầm tay.</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <div className="field">
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>
          </div>

<p className="p-muted" style={{ marginTop: 12 }}>
  Tài khoản mới?{" "}
  <Link to="/register" style={{ color: "var(--primary-dark)", fontWeight: 700 }}>
    Tạo tài khoản
  </Link>
</p>



          {error && <div className="alert">{error}</div>}
        </form>
      </div>
    </div>
  );
}
