import { useEffect, useState } from "react";
import { fetchTaskSummary } from "../api/taskreport";

export default function TaskReportSummary() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchTaskSummary({ days: 30 });
        setData(res);
      } catch (err) {
        setErr(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to load task summary"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="skeleton">Loading summary…</div>;
  if (err) return <div className="alert">{err}</div>;
  if (!data) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <div className="cards3">
        <div className="mini">
          <div className="mini__label">Tổng task</div>
          <div className="mini__value mono">{data.totalCreated}</div>
          <div className="mini__hint">Tạo trong 30 ngày</div>
        </div>

        <div className="mini">
          <div className="mini__label">Hoàn thành</div>
          <div className="mini__value mono">{data.completed}</div>
          <div className="mini__hint">{data.completionRate}% completion</div>
        </div>

        <div className="mini">
          <div className="mini__label">Đang mở</div>
          <div className="mini__value mono">{data.open}</div>
          <div className="mini__hint">Chưa hoàn thành</div>
        </div>

        <div className="mini">
          <div className="mini__label">Trễ hạn</div>
          <div className="mini__value mono">{data.overdue}</div>
          <div className="mini__hint">Quá due date</div>
        </div>

        <div className="mini">
          <div className="mini__label">Due hôm nay</div>
          <div className="mini__value mono">{data.dueToday}</div>
          <div className="mini__hint">Cần xử lý gấp</div>
        </div>

        <div className="mini">
          <div className="mini__label">7 ngày tới</div>
          <div className="mini__value mono">{data.dueNext7Days}</div>
          <div className="mini__hint">Sắp tới hạn</div>
        </div>
      </div>
    </div>
  );
}
