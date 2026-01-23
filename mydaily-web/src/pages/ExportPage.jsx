import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";

function pad2(n) {
  return String(n).padStart(2, "0");
}
function monthStartYear() {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

const EXPORTS = [
  { key: "expenses", title: "Expenses", desc: "Danh sách chi tiêu theo tháng" },
  { key: "budgets", title: "Budgets", desc: "Ngân sách theo tháng" },
  { key: "reports", title: "Finance Reports", desc: "Tổng hợp theo danh mục" },
];

export default function ExportPage() {
  const { accountType, meLoading } = useOutletContext();

  const { month: m0, year: y0 } = useMemo(() => monthStartYear(), []);
  const [type, setType] = useState("expenses");
  const [format, setFormat] = useState("csv");
  const [month, setMonth] = useState(m0);
  const [year, setYear] = useState(y0);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const token = useMemo(() => localStorage.getItem("token"), []);
  const canExport = !meLoading && accountType === "PREMIUM";

  const active = EXPORTS.find((x) => x.key === type);
  const ext = format === "xlsx" ? "xlsx" : "csv";
  const filename = `${type}_${year}-${pad2(month)}.${ext}`;
  const endpoint = `/export/${type}?format=${format}&month=${month}&year=${year}`;

  async function downloadExport() {
    setError("");
    if (!token) return setError("Bạn chưa đăng nhập (không có token).");
    if (!canExport) return setError("Tính năng Export chỉ dành cho Premium.");

    setDownloading(true);
    try {
      const url = `http://localhost:3000${endpoint}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
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

  return (
    <div className="pageWrap">
      <div className="pageHeader">
        <div>
          <div className="pageTitle">Export Data</div>
          <div className="pageSub">Tải dữ liệu xuống dạng CSV hoặc Excel (XLSX) theo tháng.</div>
        </div>

        <div className="pageActions">
          <span className="hintChip">File: <b>{filename}</b></span>
        </div>
      </div>

      {!meLoading && accountType !== "PREMIUM" && (
        <div className="banner banner--warn">
          Bạn đang ở gói <b>{accountType}</b>. Export chỉ dành cho <b>PREMIUM</b>.
        </div>
      )}

      <div className="grid2">
        {/* Left: Form */}
        <div className="panel">
          <div className="panel__title">Thiết lập export</div>

          <div className="segmented">
            {EXPORTS.map((x) => (
              <button
                key={x.key}
                type="button"
                className={type === x.key ? "segmented__btn is-active" : "segmented__btn"}
                onClick={() => setType(x.key)}
              >
                <div className="segmented__top">{x.title}</div>
                <div className="segmented__sub">{x.desc}</div>
              </button>
            ))}
          </div>

          <div className="formGrid">
            <label className="field2">
              <div className="label2">Định dạng</div>
              <select value={format} onChange={(e) => setFormat(e.target.value)} className="input2">
                <option value="csv">CSV</option>
                <option value="xlsx">Excel (XLSX)</option>
              </select>
              <div className="help2">CSV nhẹ, XLSX đẹp khi mở bằng Excel.</div>
            </label>

            <label className="field2">
              <div className="label2">Tháng</div>
              <input
                className="input2"
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              />
            </label>

            <label className="field2">
              <div className="label2">Năm</div>
              <input
                className="input2"
                type="number"
                min={2000}
                max={2100}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </label>
          </div>

          {error && <div className="banner banner--danger">{error}</div>}

          <div className="panel__actions">
            <button className="btn btn-primary" onClick={downloadExport} disabled={downloading || !canExport}>
              {downloading ? "Đang export..." : "Export"}
            </button>
            {/* <div className="muted">API: <code className="codePill">{endpoint}</code></div> */}
          </div>
        </div>

        {/* Right: Preview */}
        <div className="panel">
          <div className="panel__title">Xem trước</div>

          <div className="previewCard">
            <div className="previewRow">
              <div className="previewLabel">Loại dữ liệu</div>
              <div className="previewValue">{active?.title}</div>
            </div>
            <div className="previewRow">
              <div className="previewLabel">Thời gian</div>
              <div className="previewValue">{pad2(month)}/{year}</div>
            </div>
            <div className="previewRow">
              <div className="previewLabel">Định dạng</div>
              <div className="previewValue">{format.toUpperCase()}</div>
            </div>
            <div className="previewRow">
              <div className="previewLabel">Tên file</div>
              <div className="previewValue"><b>{filename}</b></div>
            </div>

            <div className="divider" />

            <div className="muted">
              Mẹo: Nếu bạn muốn nộp bài “xịn”, hãy export XLSX và mở thử để kiểm tra tiếng Việt/format.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
