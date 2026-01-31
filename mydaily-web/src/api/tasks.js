import api from "./axios";

/**
 * GET /tasks
 */
export async function fetchTasks(params = {}) {
  const res = await api.get("/tasks", { params });
  return res.data;
}

/**
 * POST /tasks
 */
export async function createTask(payload) {
  const res = await api.post("/tasks", payload);
  return res.data;
}

/**
 * PATCH /tasks/:id
 */
export async function updateTask(id, payload) {
  const res = await api.patch(`/tasks/${id}`, payload);
  return res.data;
}

/**
 * DELETE /tasks/:id
 */
export async function deleteTask(id) {
  const res = await api.delete(`/tasks/${id}`);
  return res.data;
}

/**
 * PATCH /tasks/:id/complete
 * returns: { task, streak }
 */
export async function completeTask(id) {
  const res = await api.patch(`/tasks/${id}/complete`);
  return res.data;
}
