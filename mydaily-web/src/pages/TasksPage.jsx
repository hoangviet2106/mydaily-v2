import { useEffect, useMemo, useState } from "react";
import TaskDrawer from "../components/TaskDrawer";
import TaskFilters from "../components/TaskFilters";
import TaskList from "../components/TaskList";
import { createTask, deleteTask, fetchTasks, updateTask } from "../api/tasks";

function normalizeDateInput(v) {
  // HTML date input returns "YYYY-MM-DD" or ""
  return v ? v : null;
}

export default function TasksPage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

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
  const [drawerMode, setDrawerMode] = useState("create"); // create | edit
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

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
          // is_completed có thể update bằng toggle nhanh ở list (bên dưới)
        });
      }
      setDrawerOpen(false);
      await load();
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

  const onToggleComplete = async (task) => {
    // optimistic UI
    const next = items.map((x) => (x.id === task.id ? { ...x, is_completed: !x.is_completed } : x));
    setItems(next);

    try {
      await updateTask(task.id, { is_completed: !task.is_completed });
      await load();
    } catch (err) {
      // rollback
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
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Delete failed";
      setErr(msg);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / filters.pageSize));

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
          <div className="mini__value mono">{items.filter((x) => x.is_completed).length}</div>
          <div className="mini__hint">Danh sách hiện có</div>
        </div>

        <div className="mini">
          <div className="mini__label">Mở</div>
          <div className="mini__value mono">{items.filter((x) => !x.is_completed).length}</div>
          <div className="mini__hint">Danh sách hiện có</div>
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

        <div className="toolbar__right">
          <span className="tag">
            Trang <span className="mono"> {filters.page} </span>
          </span>
          <span className="tag">
            Kích cỡ <span className="mono"> {filters.pageSize} </span>
          </span>
        </div>
      </div>

      {/* Error */}
      {err ? <div className="alert">{err}</div> : null}

      {/* Table */}
      <TaskList
        loading={loading}
        items={items}
        onEdit={openEdit}
        onDelete={onDelete}
        onToggleComplete={onToggleComplete}
      />

      {/* Pager */}
      <div className="toolbar" style={{ marginTop: 12 }}>
        <div className="toolbar__left">
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
            disabled={filters.page <= 1}
          >
            Trước
          </button>

          <div className="hint">
            Trang <b className="mono">{filters.page}</b> /{" "}
            <b className="mono">{Math.max(1, Math.ceil(total / filters.pageSize))}</b> · Total{" "}
            <b className="mono">{total}</b>
          </div>

          <button
            className="btn btn-sm"
            type="button"
            onClick={() =>
              setFilters((p) => ({
                ...p,
                page: Math.min(Math.max(1, Math.ceil(total / p.pageSize)), p.page + 1),
              }))
            }
            disabled={filters.page >= Math.max(1, Math.ceil(total / filters.pageSize))}
          >
            Sau
          </button>
        </div>

        <div className="toolbar__right">
          <select
            className="input input--sm"
            value={filters.pageSize}
            onChange={(e) => setFilters((p) => ({ ...p, pageSize: Number(e.target.value), page: 1 }))}
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>
        </div>
      </div>

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
