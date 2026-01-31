import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function monthStartYear() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}
function prevMonthYear(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (m <= 1) return { month: 12, year: y - 1 };
  return { month: m - 1, year: y };
}

const EXPORTS = [
  { key: "expenses", title: "Expenses", desc: "Danh sách chi tiêu theo tháng" },
  { key: "budgets", title: "Budgets", desc: "Ngân sách theo tháng" },
  { key: "reports", title: "Finance Reports", desc: "Tổng hợp theo danh mục" },
];

function TabCard({ active, title, desc, onClick }) {
  return (
    <button
      type="button"
      className={active ? "segmented__btn is-active" : "segmented__btn"}
      onClick={onClick}
    >
      <div className="segmented__top">{title}</div>
      <div className="segmented__sub">{desc}</div>
    </button>
  );
}

export default function ExportPage() {
  const { accountType, meLoading } = useOutletContext();

  const { month: m0, year: y0 } = useMemo(() => monthStartYear(), []);
  const [type, setType] = useState("expenses");
  const [format, setFormat] = useState("csv");
  const [month, setMonth] = useState(m0);
  const [year, setYear] = useState(y0);

  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  // đọc token realtime để tránh case login xong token mới mà memo không update
  const token = localStorage.getItem("token");

  const canExport = !meLoading && accountType === "PREMIUM";
  const active = EXPORTS.find((x) => x.key === type);

  const ext = format === "xlsx" ? "xlsx" : "csv";
  const filename = `${type}_${year}-${pad2(month)}.${ext}`;
  const endpoint = `/export/${type}?format=${format}&month=${month}&year=${year}`;

  const canExportReason = useMemo(() => {
    if (meLoading) return "Đang tải thông tin tài khoản…";
    if (!token) return "Bạn chưa đăng nhập (không có token).";
    if (accountType !== "PREMIUM") return "Tính năng Export chỉ dành cho Premium.";
    return "";
  }, [meLoading, token, accountType]);

  async function downloadExport() {
    setError("");

    if (!token) return setError("Bạn chưa đăng nhập (không có token).");
    if (!canExport) return setError("Tính năng Export chỉ dành cho Premium.");

    setDownloading(true);
    try {
      const url = `http://localhost:3000${endpoint}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Export failed: ${res.status}`);
      }

      const blob = await res.blob();
      const a = document.createElement("a");
      const objectUrl = window.URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (e) {
      setError(e?.message || "Export failed.");
    } finally {
      setDownloading(false);
    }
  }

  const onPickThisMonth = () => {
    const cur = monthStartYear();
    setMonth(cur.month);
    setYear(cur.year);
  };

  const onPickPrevMonth = () => {
    const cur = monthStartYear();
    const prev = prevMonthYear(cur.month, cur.year);
    setMonth(prev.month);
    setYear(prev.year);
  };

  return (
    <div className="card pad-lg reportWide">
      {/* Header */}
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0 }}>Trích xuất dữ liệu</h3>
          <p className="p-muted">Tải dữ liệu xuống dạng CSV hoặc Excel (XLSX) theo tháng.</p>
        </div>

        <div className="row">
          <span className="tag">
            File <span className="mono">{filename}</span>
          </span>
        </div>
      </div>

      {!meLoading && accountType !== "PREMIUM" ? (
        <div className="banner banner--warn" style={{ marginTop: 12 }}>
          <div>
            <div className="banner__title">Giới hạn gói tài khoản</div>
            <div className="banner__sub">
              Bạn đang ở gói <b>{accountType}</b>. Export chỉ dành cho <b>PREMIUM</b>.
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="banner banner--danger" style={{ marginTop: 12 }}>
          <div>
            <div className="banner__title">Export lỗi</div>
            <div className="banner__sub">{error}</div>
          </div>
        </div>
      ) : null}

      {/* Config */}
      <div className="toolbar" style={{ marginTop: 12 }}>
        <div className="toolbar__left">
          <div className="toolbar__group">
            <span className="tag">Quick</span>
            <button className="btn btn-sm" type="button" onClick={onPickThisMonth}>
              Tháng này
            </button>
            <button className="btn btn-sm" type="button" onClick={onPickPrevMonth}>
              Tháng trước
            </button>
          </div>

          <div className="toolbar__group">
            <label className="label" style={{ margin: 0 }}>
              Format
            </label>
            <select className="input input--sm" value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel (XLSX)</option>
            </select>

            <label className="label" style={{ margin: 0 }}>
              Month
            </label>
            <input
              className="input input--sm"
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              style={{ width: 90 }}
            />

            <label className="label" style={{ margin: 0 }}>
              Year
            </label>
            <input
              className="input input--sm"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{ width: 110 }}
            />
          </div>
        </div>

        <div className="toolbar__right">
          <button
            className="btn btn-primary"
            onClick={downloadExport}
            disabled={downloading || !canExport}
            title={!canExport ? canExportReason : "Download file"}
          >
            {downloading ? "Đang export..." : "Export"}
          </button>
        </div>
      </div>

      {/* Types */}
      <div style={{ marginTop: 14 }}>
        <div className="segmented">
          {EXPORTS.map((x) => (
            <TabCard
              key={x.key}
              active={type === x.key}
              title={x.title}
              desc={x.desc}
              onClick={() => setType(x.key)}
            />
          ))}
        </div>
      </div>

      {/* Preview / info */}
      <div className="cards3" style={{ marginTop: 14 }}>
        <div className="mini">
          <div className="mini__label">Loại dữ liệu</div>
          <div className="mini__value">{active?.title}</div>
          <div className="mini__hint">{active?.desc}</div>
        </div>

        <div className="mini">
          <div className="mini__label">Thời gian</div>
          <div className="mini__value mono">
            {pad2(Number(month))}/{year}
          </div>
          <div className="mini__hint">Dữ liệu lọc theo tháng</div>
        </div>

        <div className="mini">
          <div className="mini__label">Endpoint</div>
          <div className="mini__value mono" style={{ fontSize: 13 }}>
            {endpoint}
          </div>
          <div className="mini__hint">API route đang gọi</div>
        </div>
      </div>

      <div className="banner" style={{ marginTop: 14 }}>
        <div>
          <div className="banner__title">Mẹo</div>
          <div className="banner__sub">
            CSV nhẹ và nhanh. XLSX đẹp khi mở Excel và dễ nộp bài (kiểm tra font tiếng Việt).
          </div>
        </div>
      </div>
    </div>
  );
}
