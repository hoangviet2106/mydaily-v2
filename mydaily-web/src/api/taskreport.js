import api from "./axios";
/**
 * GET /taskreport/summary
 * params: { days } OR { from, to }
 */
export function fetchTaskSummary(params = {}) {
  return api.get("/taskreport/summary", { params }).then((r) => r.data);
}

/**
 * GET /taskreport/trend
 * params: { days }
 */
export function fetchTaskTrend(params = {}) {
  return api.get("/taskreport/trend", { params }).then((r) => r.data);
}

/**
 * GET /taskreport/top-overdue
 * params: { limit }
 */
export function fetchTaskOverdue(params = {}) {
  return api.get("/taskreport/top-overdue", { params }).then((r) => r.data);
}
