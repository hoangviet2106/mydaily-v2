import { useMemo, useState } from "react";
import TaskReportSummary from "../components/TaskReportSummary";
import TaskReportTrend from "../components/TaskReportTrend";
import TaskReportOverdue from "../components/TaskReportOverdue";

function Tab({ active, onClick, children }) {
  return (
    <button className={active ? "tab tab--active" : "tab"} onClick={onClick} type="button">
      {children}
    </button>
  );
}

export default function TaskReportsPage() {
  const [tab, setTab] = useState("summary"); // summary | trend | overdue

  const headerTitle = useMemo(() => {
    switch (tab) {
      case "summary":
        return "Tổng quan";
      case "trend":
        return "Xu hướng";
      case "overdue":
        return "Trễ hạn";
      default:
        return "Task Reports";
    }
  }, [tab]);

  return (
    <div className="container reportWide">
      {/* Header */}
      <div className="topbar">
        <div>
          <div className="h1">Task Reports</div>
          <div className="p-muted">Theo dõi năng suất và tiến độ công việc</div>
        </div>

        {/* slot actions nếu sau này muốn thêm nút */}
        <div className="toolbar__right" />
      </div>

      {/* Tabs */}
      <div className="tabs">
        <Tab active={tab === "summary"} onClick={() => setTab("summary")}>
          Tổng quan
        </Tab>
        <Tab active={tab === "trend"} onClick={() => setTab("trend")}>
          Xu hướng
        </Tab>
        <Tab active={tab === "overdue"} onClick={() => setTab("overdue")}>
          Trễ hạn
        </Tab>
      </div>

      {/* Head / context */}
      <div className="reportHead">
        <div>
          <div className="reportTitle">{headerTitle}</div>
          <div className="p-muted">Báo cáo task theo từng góc nhìn</div>
        </div>
      </div>

      {/* Content */}
      {tab === "summary" ? <TaskReportSummary /> : null}
      {tab === "trend" ? <TaskReportTrend /> : null}
      {tab === "overdue" ? <TaskReportOverdue /> : null}
    </div>
  );
}
