import { useEffect, useState } from "react";
import { fetchTaskTrend } from "../api/taskreport";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

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
    <div className="card pad-lg" style={{ marginTop: 12 }}>
      <h4 style={{ marginTop: 0 }}>Xu hướng tạo task (30 ngày)</h4>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="created" strokeWidth={2} />
          <Line type="monotone" dataKey="completedCreated" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
