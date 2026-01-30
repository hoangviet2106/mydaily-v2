import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import logo from "../assets/mydailylogo.png";

export default function Login() {
  const [email, setEmail] = useState("test3@test.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const handleGoogle = () => {
    window.location.href = "/api/auth/google"; // đi qua proxy /api
  };


  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.removeItem("displayName");

      const to = location.state?.from || "/dashboard";
      navigate(to, { replace: true });
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
      <div className="card pad-lg login-box" style={{ width: "100%", maxWidth: 520 }}>
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
            {/* Button google */}
            <button
              type="button"
              className="btn btn-google btn-block google-btn"
              onClick={handleGoogle}
            >
              <span className="google-icon">
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.7 1.22 9.18 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.64 0 6.5 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.5 24.5c0-1.64-.15-3.22-.43-4.74H24v9h12.7c-.55 2.97-2.22 5.48-4.74 7.18l7.62 5.9C43.98 37.8 46.5 31.7 46.5 24.5z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.54 28.41a14.5 14.5 0 010-8.82l-7.98-6.19a24 24 0 000 21.2l7.98-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.14 15.9-5.8l-7.62-5.9c-2.11 1.42-4.82 2.27-8.28 2.27-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.5 42.62 14.64 48 24 48z"
                  />
                </svg>
              </span>

              <span className="google-text">Continue with Google</span>
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
