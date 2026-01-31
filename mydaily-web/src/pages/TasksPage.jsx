import { useEffect, useMemo, useState } from "react";
import TaskDrawer from "../components/TaskDrawer";
import TaskFilters from "../components/TaskFilters";
import TaskList from "../components/TaskList";
import api from "../api/axios"; // ✅ NEW: dùng để load streak từ /dashboard/basic
import {
  createTask,
  deleteTask,
  fetchTasks,
  updateTask,
  completeTask,
} from "../api/tasks";

function normalizeDateInput(v) {
  return v ? v : null;
}

export default function TasksPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [streak, setStreak] = useState(null);

  const [filters, setFilters] = useState({
    status: "all",
    q: "",
    dueFrom: "",
    dueTo: "",
    sort: "created_desc",
    page: 1,
    pageSize: 20,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("create");
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const params = useMemo(() => {
    return {
      status: filters.status,
      q: filters.q,
      dueFrom: filters.dueFrom || undefined,
      dueTo: filters.dueTo || undefined,
      sort: filters.sort,
      page: filters.page,
      pageSize: filters.pageSize,
    };
  }, [filters]);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await fetchTasks(params);
      setItems(data.items || []);
      setTotal(Number(data.total || 0));
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to fetch tasks";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: load streak from backend so refresh won't reset to 0
  const loadStreak = async () => {
    try {
      const res = await api.get("/dashboard/basic");
      setStreak(res.data?.streak ?? null);
    } catch {
      // ignore (không block UI tasks)
    }
  };

  // load tasks when filters change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // ✅ load streak once on page open (and you can also refresh it after actions if needed)
  useEffect(() => {
    loadStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setDrawerMode("create");
    setSelected(null);
    setDrawerOpen(true);
  };

  const openEdit = (task) => {
    setDrawerMode("edit");
    setSelected(task);
    setDrawerOpen(true);
  };

  const onSubmitDrawer = async (values) => {
    setSubmitting(true);
    setErr("");
    try {
      if (drawerMode === "create") {
        await createTask({
          title: values.title,
          description: values.description || null,
          due_date: normalizeDateInput(values.due_date),
        });
      } else {
        await updateTask(selected.id, {
          title: values.title,
          description: values.description || null,
          due_date: normalizeDateInput(values.due_date),
        });
      }
      setDrawerOpen(false);
      await load();
      await loadStreak(); // ✅ optional: sync streak after create/edit
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Submit failed";
      setErr(msg);
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 🔥 COMPLETE TASK + UPDATE STREAK
   */
  const onToggleComplete = async (task) => {
    if (task.is_completed) return;

    // optimistic UI
    setItems((prev) =>
      prev.map((x) => (x.id === task.id ? { ...x, is_completed: true } : x))
    );

    try {
      const result = await completeTask(task.id);
      // result = { task, streak }

      setItems((prev) =>
        prev.map((x) => (x.id === task.id ? result.task : x))
      );

      setStreak(result.streak); // ✅ realtime update
    } catch (err) {
      setItems(items);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Update failed";
      setErr(msg);
    }
  };

  const onDelete = async (task) => {
    const ok = window.confirm(`Delete task: "${task.title}"?`);
    if (!ok) return;

    setErr("");
    try {
      await deleteTask(task.id);
      await load();
      await loadStreak(); // ✅ sync streak if needed
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Delete failed";
      setErr(msg);
    }
  };

  return (
    <div className="pageWidth">
      {/* Header */}
      <div className="dashHeader">
        <div>
          <div className="pageTitle">Công việc</div>
          <div className="dashDate">Quản lý công việc của bạn</div>
        </div>

        <div className="pageActions">
          <button className="btn btn-primary" onClick={openCreate} type="button">
            + Tạo mới nhiệm vụ
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="cards3">
        <div className="mini">
          <div className="mini__label">Tổng</div>
          <div className="mini__value mono">{total}</div>
          <div className="mini__hint">Tất cả (after filters)</div>
        </div>

        <div className="mini">
          <div className="mini__label">Hoàn thành</div>
          <div className="mini__value mono">
            {items.filter((x) => x.is_completed).length}
          </div>
          <div className="mini__hint">Danh sách hiện có</div>
        </div>

        <div className="mini">
          <div className="mini__label">Mở</div>
          <div className="mini__value mono">
            {items.filter((x) => !x.is_completed).length}
          </div>
          <div className="mini__hint">Danh sách hiện có</div>
        </div>

        {/* 🔥 Streak card */}
        <div className="mini">
          <div className="mini__label">Streak</div>
          <div className="mini__value mono">🔥 {streak?.current_streak ?? 0}</div>
          <div className="mini__hint">
            {streak
              ? streak.today_done
                ? "✅ Hôm nay đã giữ streak"
                : "⚠️ Chưa hoàn thành hôm nay"
              : "Đang tải streak..."}
          </div>
        </div>
      </div>

      {/* Toolbar Filters */}
      <div className="toolbar taskToolbar">
        <div className="toolbar__left">
          <TaskFilters
            value={filters}
            onChange={(next) => setFilters((prev) => ({ ...prev, ...next, page: 1 }))}
            onReset={() =>
              setFilters({
                status: "all",
                q: "",
                dueFrom: "",
                dueTo: "",
                sort: "created_desc",
                page: 1,
                pageSize: 20,
              })
            }
          />
        </div>
      </div>

      {err ? <div className="alert">{err}</div> : null}

      {/* Table */}
      <TaskList
        loading={loading}
        items={items}
        onEdit={openEdit}
        onDelete={onDelete}
        onToggleComplete={onToggleComplete}
      />

      {/* Drawer */}
      <TaskDrawer
        open={drawerOpen}
        mode={drawerMode}
        submitting={submitting}
        initialValue={selected}
        onClose={() => setDrawerOpen(false)}
        onSubmit={onSubmitDrawer}
      />
    </div>
  );
}
