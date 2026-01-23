export default function Modal({ open, title, children, onClose, footer }) {
  if (!open) return null;

  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" onMouseDown={onBackdrop}>
      <div className="modal__panel">
        <div className="modal__head">
          <div className="modal__title">{title}</div>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal__body">{children}</div>

        {footer ? <div className="modal__foot">{footer}</div> : null}
      </div>
    </div>
  );
}
