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
          <option value="all">Tất cả</option>
          <option value="open">Đang mở</option>
          <option value="completed">Hoàn Thành</option>
          <option value="overdue">Quá hạn</option>
        </select>

        <input
          className="input input--sm"
          placeholder="Tìm kiếm tiêu đề / mô tả..."
          value={local.q}
          onChange={(e) => setLocal((p) => ({ ...p, q: e.target.value }))}
          style={{ width: 260 }}
        />

        <select
          className="input input--sm"
          value={local.sort}
          onChange={(e) => setLocal((p) => ({ ...p, sort: e.target.value }))}
        >
          <option value="created_desc">Tạo (mới nhất)</option>
          <option value="created_asc">Tạo (cũ)</option>
          <option value="due_asc">Hạn (sớm)</option>
          <option value="due_desc">Hạn (muộn)</option>
        </select>
      </div>

      <div className="toolbar__group">
        <input
          className="input input--sm"
          type="date"
          value={local.dueFrom}
          onChange={(e) => setLocal((p) => ({ ...p, dueFrom: e.target.value }))}
          title="Hạn từ"
        />
        <input
          className="input input--sm"
          type="date"
          value={local.dueTo}
          onChange={(e) => setLocal((p) => ({ ...p, dueTo: e.target.value }))}
          title="Hạn đến"
        />

        <button className="btn btn-sm btn-primary" type="button" onClick={apply}>
          Tìm 
        </button>
        <button className="btn btn-sm btn-ghost" type="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </>
  );
}
