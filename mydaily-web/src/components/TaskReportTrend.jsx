import { useEffect, useState } from "react";
import { fetchTaskTrend } from "../api/taskreport";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function TaskReportTrend() {
  const [data, setData] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchTaskTrend({ days: 30 });
        setData(res.points || []);
      } catch (err) {
        setErr(
          err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to load trend"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="skeleton">Loading trend…</div>;
  if (err) return <div className="alert">{err}</div>;

  return (
    <div className="card pad-lg" style={{ marginTop: 14 }}>
      <div style={{ fontWeight: 900, marginBottom: 6 }}>
        Xu hướng tạo & hoàn thành task
      </div>
      <div className="p-muted" style={{ marginBottom: 10 }}>
        Thống kê trong 30 ngày gần nhất
      </div>

      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="created"
              stroke="var(--primary)"
              strokeWidth={3}
              dot={false}
              name="Created"
            />
            <Line
              type="monotone"
              dataKey="completedCreated"
              stroke="var(--ok)"
              strokeWidth={3}
              dot={false}
              name="Completed"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
