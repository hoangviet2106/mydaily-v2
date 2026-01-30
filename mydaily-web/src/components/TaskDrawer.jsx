import { useEffect, useState } from "react";
import Modal from "./Modal";

export default function TaskDrawer({ open, mode, initialValue, submitting, onSubmit, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!open) return;
    setErr("");
    setTitle(initialValue?.title || "");
    setDescription(initialValue?.description || "");
    setDueDate(initialValue?.due_date ? String(initialValue.due_date).slice(0, 10) : "");
  }, [open, initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr("");

    const t = String(title || "").trim();
    if (!t) return setErr("Title is required.");
    if (t.length < 2) return setErr("Title must be at least 2 characters.");

    onSubmit?.({
      title: t,
      description: String(description || "").trim(),
      due_date: dueDate, // "YYYY-MM-DD" hoặc ""
    });
  };

  const heading = mode === "edit" ? "Edit task" : "New task";

  const footer = (
    <>
      <button className="btn" type="button" onClick={onClose} disabled={submitting}>
        Cancel
      </button>
      <button className="btn btn-primary" type="submit" form="taskForm" disabled={submitting}>
        {submitting ? "Saving..." : "Save"}
      </button>
    </>
  );

  return (
    <Modal open={open} title={heading} onClose={onClose} footer={footer}>
      <form id="taskForm" onSubmit={handleSubmit}>
        {err ? (
          <div className="alert" role="alert">
            {err}
          </div>
        ) : null}

        <div className="field">
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="field">
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="label">Due date</label>
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </form>
    </Modal>
  );
}
