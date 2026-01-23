import api from "./axios";

export async function fetchBudgetByMonthYear(month, year) {
  const res = await api.get("/budgets", { params: { month, year } });
  return res.data;
}

export async function upsertBudget({ month, year, limit_amount }) {
  const res = await api.post("/budgets", {
    month: Number(month),
    year: Number(year),
    limit_amount: Number(limit_amount),
  });
  return res.data;
}
