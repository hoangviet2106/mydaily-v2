import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const goLogin = () => navigate("/login");

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "auto";

    const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -100px 0px" };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible"));
    }, observerOptions);

    document.querySelectorAll(".lp .fade-in-scroll").forEach((el) => observer.observe(el));

    const handler = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;

      const href = a.getAttribute("href");
      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    document.addEventListener("click", handler);

    return () => {
      observer.disconnect();
      document.removeEventListener("click", handler);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="lp">
      {/* Background */}
      <div className="bg-decoration purple"></div>
      <div className="bg-decoration pink"></div>
      <div className="bg-decoration mint"></div>

      {/* Header */}
      <header>
        <nav>
          <div className="logo">MyDaily</div>
          <div className="nav-links">
            <a href="#features">Tính năng</a>
            <a href="#why">Vì sao MyDaily</a>
            <a href="#pricing">Gói dịch vụ</a>
            <a href="#infor">Thông tin chung</a>
            <button className="btn-nav" type="button" onClick={goLogin}>
              Bắt đầu
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">✨ Miễn phí cho sinh viên & người đi làm trẻ</div>
        <h1>
          Quản lý cuộc sống của bạn<br />
          <span className="gradient-text">Từng ngày một</span>
        </h1>
        <p>
          Theo dõi công việc, chi tiêu và ngân sách trong một bảng điều khiển đơn giản.
          Được thiết kế cho cách bạn làm việc mỗi ngày.
        </p>

        <div className="hero-cta">
          <button className="btn-primary" type="button" onClick={goLogin}>
            Bắt đầu miễn phí
          </button>

        </div>

        <div className="hero-illustration">
          <div className="hero-visual">
            <div className="visual-card">
              <h4>📋 Công việc hôm nay</h4>
              <div className="visual-item">
                <div className="visual-checkbox"></div>
                <span>Họp nhóm lúc 14:00</span>
              </div>
              <div className="visual-item">
                <div className="visual-checkbox"></div>
                <span>Hoàn thành đề xuất dự án</span>
              </div>
              <div className="visual-item">
                <div className="visual-checkbox"></div>
                <span>Đi chợ</span>
              </div>
            </div>

            <div className="visual-card mint">
              <h4>💰 Tổng quan ngân sách</h4>
              <div style={{ margin: "1rem 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.9rem" }}>1.240.000đ</span>
                  <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>trên 2.000.000đ</span>
                </div>
                <div className="visual-bar">
                  <div className="visual-bar-fill"></div>
                </div>
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "1rem" }}>
                ✓ Bạn đang chi tiêu đúng kế hoạch tháng này
              </div>
            </div>

            <div className="visual-card coral">
              <h4>📊 Tuần này</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Việc đã xong</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.25rem" }}>24</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Tiết kiệm</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.25rem", color: "var(--accent-mint)" }}>
                    180.000đ
                  </div>
                </div>
              </div>
            </div>

            <div className="visual-card">
              <h4>🎯 Mục tiêu</h4>
              <div style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.2rem" }}>🏋️</span>
                  <span style={{ fontSize: "0.9rem" }}>Tập gym 3 buổi/tuần</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.2rem" }}>💼</span>
                  <span style={{ fontSize: "0.9rem" }}>Tiết kiệm 500.000đ tháng này</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features fade-in-scroll" id="features">
        <div className="section-header">
          <div className="section-label">TÍNH NĂNG</div>
          <h2>
            Đủ dùng cho bạn,<br />
            không dư thừa
          </h2>
          <p>Các công cụ đơn giản giúp bạn tổ chức cuộc sống mà không bị quá tải</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">✓</div>
            <h3>Quản lý công việc</h3>
            <p>Tạo, sắp xếp và hoàn thành công việc hằng ngày với giao diện gọn gàng, không xao nhãng.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💳</div>
            <h3>Theo dõi chi tiêu</h3>
            <p>Ghi lại chi tiêu chỉ trong vài giây, phân loại rõ ràng và biết tiền của bạn đang đi đâu.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>Lập ngân sách</h3>
            <p>Đặt ngân sách hợp lý cho từng danh mục và nhận cảnh báo khi sắp vượt mức.</p>
          </div>

          <div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Báo cáo thông minh</h3>
            <p>Biểu đồ trực quan giúp bạn hiểu rõ thói quen chi tiêu và làm việc của mình.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="pricing fade-in-scroll" id="pricing">
        <div className="section-header">
          <div className="section-label">GÓI DỊCH VỤ</div>
          <h2>Chọn gói phù hợp</h2>
          <p>Bắt đầu miễn phí, nâng cấp khi bạn sẵn sàng</p>
        </div>

        <div className="pricing-grid">
          <div className="pricing-card">
            <div className="pricing-badge">Dành cho sinh viên</div>
            <h3>Miễn phí</h3>
            <div className="pricing-price">
              0đ<span>/tháng</span>
            </div>
            <ul className="pricing-features">
              <li>Không giới hạn công việc</li>
              <li>Theo dõi chi tiêu</li>
              <li>Ngân sách cơ bản</li>
              <li>Báo cáo tuần</li>
              <li>Sử dụng trên di động</li>
            </ul>
            <button className="pricing-btn" type="button" onClick={goLogin}>
              Dùng miễn phí
            </button>
          </div>

          <div className="pricing-card premium">
            <div className="pricing-badge">⭐ Phổ biến nhất</div>
            <h3>Premium</h3>
            <div className="pricing-price">
              49.000đ<span>/tháng</span>
            </div>
            <ul className="pricing-features">
              <li>Tất cả tính năng gói Miễn phí</li>
              <li>Phân tích nâng cao</li>
              <li>Danh mục tuỳ chỉnh</li>
              <li>Theo dõi mục tiêu</li>
              <li>Hỗ trợ ưu tiên</li>
              <li>Xuất báo cáo</li>
            </ul>
            <button className="pricing-btn" type="button" onClick={goLogin}>
              Nâng cấp Premium
            </button>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta fade-in-scroll" id="infor">
        <div className="lp-info-grid">
          <div className="lp-info-col">
            <h3>Thông tin chung</h3>
            <ul>
              <li>Về MyDaily</li>
              <li>Hướng dẫn bắt đầu</li>
              <li>Điều khoản & điều kiện</li>
              <li>Chính sách bảo mật</li>
            </ul>
          </div>

          <div className="lp-info-col">
            <h3>Sản phẩm & Tính năng</h3>
            <ul>
              <li>Quản lý công việc</li>
              <li>Quản lý chi tiêu</li>
              <li>Lập ngân sách</li>
              <li>Báo cáo & thống kê</li>
            </ul>
          </div>

          <div className="lp-info-col">
            <h3>Hỗ trợ khách hàng</h3>
            <ul>
              <li>Email: mydaily@gmail.com</li>
              <li>Hotline: 1800 1234</li>
              <li>Câu hỏi thường gặp (FAQ)</li>
              <li>Góp ý & phản hồi</li>
            </ul>
          </div>
        </div>
        <div className="lp-socials">
          <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
            <svg viewBox="0 0 24 24">
              <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.7V12h2.7V9.8c0-2.7 1.6-4.2 4-4.2
        1.2 0 2.4.2 2.4.2v2.6h-1.4c-1.4 0-1.8.9-1.8 1.7V12h3.1l-.5 2.9h-2.6v7A10 10 0 0 0 22 12z"/>
            </svg>
          </a>

          <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">
            <svg viewBox="0 0 24 24">
              <path d="M23.5 6.2s-.2-1.6-.9-2.3c-.8-.9-1.7-.9-2.1-1C17.6 2.5 12 2.5 12 2.5h0
        s-5.6 0-8.5.4c-.4.1-1.3.1-2.1 1C.7 4.6.5 6.2.5 6.2S0 8.1 0 10v2
        c0 1.9.5 3.8.5 3.8s.2 1.6.9 2.3c.8.9 1.9.9 2.4 1
        1.7.2 7.2.4 7.2.4s5.6 0 8.5-.4c.4-.1 1.3-.1 2.1-1
        .7-.7.9-2.3.9-2.3s.5-1.9.5-3.8v-2c0-1.9-.5-3.8-.5-3.8zM9.7 14.7V7.9l6.2 3.4-6.2 3.4z"/>
            </svg>
          </a>

          <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
            <svg viewBox="0 0 24 24">
              <path d="M21 8.5a6.6 6.6 0 0 1-3.9-1.3v8.1a6.7 6.7 0 1 1-6.7-6.7c.2 0 .4 0 .6.1v3.5
        a3.2 3.2 0 1 0 2.8 3.1V2h3.3a6.6 6.6 0 0 0 4.3 4.2v2.3z"/>
            </svg>
          </a>

          <a href="mailto:support@mydaily.app" aria-label="Gmail">
            <svg viewBox="0 0 24 24">
              <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z" />
            </svg>
          </a>
        </div>

      </section>

      {/* Footer */}
      <footer>
        <p>© 2026 MyDaily. Đồng hành cùng bạn mỗi ngày.</p>
      </footer>
    </div>
  );
}
