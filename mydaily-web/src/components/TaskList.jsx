function formatDate(d) {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("vi-VN");
}

function isOverdue(task) {
  if (task.is_completed) return false;
  if (!task.due_date) return false;
  const due = new Date(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

export default function TaskList({ loading, items, onEdit, onDelete, onToggleComplete }) {
  return (
    <div className="table-scroll" style={{ marginTop: 12 }}>
      <div className="table-wrap">
        <table className="table table__head-sticky">
          <thead>
            <tr>
              <th style={{ width: 56 }}></th>
              <th>Tiêu đề</th>
              <th style={{ width: 140 }}>Ngày</th>
              <th style={{ width: 140 }}>Trạng thái</th>
              <th style={{ width: 190 }}>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="td-muted">
                  Loading...
                </td>
              </tr>
            ) : items?.length ? (
              items.map((t) => {
                const overdue = isOverdue(t);
                const status = t.is_completed ? "Completed" : overdue ? "Overdue" : "Open";

                const checkboxDisabled = !!t.is_completed; // ✅ không cho uncomplete

                return (
                  <tr key={t.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!t.is_completed}
                        disabled={checkboxDisabled}
                        title={checkboxDisabled ? "Task đã hoàn thành" : "Đánh dấu hoàn thành"}
                        onChange={() => {
                          if (checkboxDisabled) return;
                          onToggleComplete?.(t);
                        }}
                      />
                    </td>

                    <td>
                      <div style={{ fontWeight: 900, opacity: t.is_completed ? 0.55 : 1 }}>
                        {t.title}
                      </div>

                      {t.description ? (
                        <div className="td-muted" style={{ marginTop: 4 }}>
                          {t.description}
                        </div>
                      ) : null}
                    </td>

                    <td className="td-muted">{formatDate(t.due_date)}</td>

                    <td>
                      <span className="tag">{status}</span>
                      {overdue ? (
                        <span
                          className="tag"
                          style={{
                            marginLeft: 8,
                            color: "#8B1F2A",
                            background: "rgba(227,93,106,0.10)",
                          }}
                        >
                          Late
                        </span>
                      ) : null}
                    </td>

                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn btn-sm" type="button" onClick={() => onEdit?.(t)}>
                        Sửa
                      </button>{" "}
                      <button className="btn btn-sm btn-danger" type="button" onClick={() => onDelete?.(t)}>
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="td-muted">
                  No tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
