import api from "./axios";

export async function fetchExpenses() {
  const res = await api.get("/expenses");
  return res.data;
}

export async function createExpense(payload) {
  // payload: { amount, expense_date, category_id, note? }
  const res = await api.post("/expenses", payload);
  return res.data; // { expense, alert }
}

export async function updateExpense(id, payload) {
  const res = await api.patch(`/expenses/${id}`, payload);
  return res.data; // { expense, alert }
}

export async function deleteExpense(id) {
  const res = await api.delete(`/expenses/${id}`);
  return res.data; // { message, alert }
}
