import { useEffect, useState } from "react";
import TaskReportSummary from "../components/TaskReportSummary";
import TaskReportTrend from "../components/TaskReportTrend";
import TaskReportOverdue from "../components/TaskReportOverdue";

export default function TaskReportsPage() {
  const [tab, setTab] = useState("summary"); // summary | trend | overdue

  return (
    <div className="container reportWide">
      {/* Header */}
      <div className="topbar">
        <div>
          <div className="h1">Task Reports</div>
          <div className="p-muted">Theo dõi năng suất và tiến độ công việc</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={tab === "summary" ? "tab tab--active" : "tab"} onClick={() => setTab("summary")}>
          Tổng quan
        </button>
        <button className={tab === "trend" ? "tab tab--active" : "tab"} onClick={() => setTab("trend")}>
          Xu hướng
        </button>
        <button className={tab === "overdue" ? "tab tab--active" : "tab"} onClick={() => setTab("overdue")}>
          Trễ hạn
        </button>
      </div>

      {/* Content */}
      {tab === "summary" && <TaskReportSummary />}
      {tab === "trend" && <TaskReportTrend />}
      {tab === "overdue" && <TaskReportOverdue />}
    </div>
  );
}
