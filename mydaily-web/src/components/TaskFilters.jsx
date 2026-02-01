import { useEffect, useState } from "react";

function bangkokYMD(date = new Date()) {
  // Convert to Bangkok time then format YYYY-MM-DD
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function TaskFilters({ value, onChange, onReset }) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  const apply = () => {
    // reset page để tránh “lọc xong trống” vì đang ở page cao
    onChange?.({ ...local, page: 1 });
  };

  const setTodayBkk = () => {
    const today = bangkokYMD();
    setLocal((p) => ({ ...p, dueFrom: today, dueTo: today }));
  };

  const handleReset = () => {
    // nếu parent reset filters, thường cũng muốn về page 1
    onReset?.();
  };

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

        <button className="btn btn-sm btn-ghost" type="button" onClick={setTodayBkk} title="Set hạn = hôm nay (Bangkok)">
          Hôm nay
        </button>

        <button className="btn btn-sm btn-primary" type="button" onClick={apply}>
          Tìm
        </button>
        <button className="btn btn-sm btn-ghost" type="button" onClick={handleReset}>
          Reset
        </button>
      </div>
    </>
  );
}
