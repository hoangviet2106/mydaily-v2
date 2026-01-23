import { useEffect, useState } from "react";

export default function TaskFilters({ value, onChange, onReset }) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  const apply = () => onChange?.(local);

  return (
    <>
      <div className="toolbar__group">
        <select
          className="input input--sm"
          value={local.status}
          onChange={(e) => setLocal((p) => ({ ...p, status: e.target.value }))}
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
        </select>

        <input
          className="input input--sm"
          placeholder="Search title / description..."
          value={local.q}
          onChange={(e) => setLocal((p) => ({ ...p, q: e.target.value }))}
          style={{ width: 260 }}
        />

        <select
          className="input input--sm"
          value={local.sort}
          onChange={(e) => setLocal((p) => ({ ...p, sort: e.target.value }))}
        >
          <option value="created_desc">Created (newest)</option>
          <option value="created_asc">Created (oldest)</option>
          <option value="due_asc">Due (earliest)</option>
          <option value="due_desc">Due (latest)</option>
        </select>
      </div>

      <div className="toolbar__group">
        <input
          className="input input--sm"
          type="date"
          value={local.dueFrom}
          onChange={(e) => setLocal((p) => ({ ...p, dueFrom: e.target.value }))}
          title="Due from"
        />
        <input
          className="input input--sm"
          type="date"
          value={local.dueTo}
          onChange={(e) => setLocal((p) => ({ ...p, dueTo: e.target.value }))}
          title="Due to"
        />

        <button className="btn btn-sm btn-primary" type="button" onClick={apply}>
          Apply
        </button>
        <button className="btn btn-sm btn-ghost" type="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </>
  );
}
