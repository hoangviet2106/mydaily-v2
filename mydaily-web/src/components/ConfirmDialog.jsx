export default function ConfirmDialog({
  open,
  title = "Xác nhận",
  message = "Bạn có chắc chắn?",
  confirmText = "Có",
  cancelText = "Không",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="modalBackDrop" onMouseDown={onCancel} role="presentation">
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modalHead">
          <div className="modalTitle">{title}</div>
        </div>

        <div className="modalBody">{message}</div>

        <div className="modalFoot">
          <button className="btn btn-sm" type="button" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button className="btn btn-sm btn-danger" type="button" onClick={onConfirm} disabled={loading}>
            {loading ? "Đang xoá..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
