import { useEffect, useState } from "react";
import { fetchTaskOverdue } from "../api/taskreport";

export default function TaskReportOverdue() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchTaskOverdue({ limit: 10 });
        setItems(res.items || []);
      } catch (err) {
        setErr(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to load overdue tasks"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="skeleton">Loading overdue tasks…</div>;
  if (err) return <div className="alert">{err}</div>;

  if (items.length === 0) {
    return (
      <div className="banner banner--ok" style={{ marginTop: 14 }}>
        🎉 Không có task trễ hạn – làm tốt lắm!
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div className="table-scroll">
        <div className="table-wrap">
          <table className="table table__head-sticky">
            <thead>
              <tr>
                <th>Task</th>
                <th style={{ width: 160 }}>Due date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 900 }}>{t.title}</td>
                  <td className="td-muted">
                    {t.due_date
                      ? new Date(t.due_date).toLocaleDateString("vi-VN")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
