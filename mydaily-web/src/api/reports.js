import { fetchExpenses } from "./expenses";
import { fetchBudgetByMonthYear } from "./budgets";
import { useOutletContext } from "react-router-dom";

function toMonthYear(dateStr) {
  const d = new Date(dateStr);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

function fmtMonthKey(month, year) {
  return `${String(month).padStart(2, "0")}/${year}`;
}

export async function getBreakdownByCategory({ month, year, categories }) {
  const expenses = await fetchExpenses();
  const filtered = expenses.filter((e) => {
    const my = toMonthYear(e.expense_date);
    return my.month === Number(month) && my.year === Number(year);
  });

  const catNameById = new Map((categories || []).map((c) => [String(c.id), c.name]));
  const sums = new Map();

  for (const e of filtered) {
    const cid = String(e.category_id);
    sums.set(cid, (sums.get(cid) || 0) + Number(e.amount || 0));
  }

  const rows = [...sums.entries()]
    .map(([cid, total]) => ({
      category_id: cid,
      category: catNameById.get(cid) || "Unknown",
      total,
    }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);
  return { rows, grandTotal };
}

export async function getBudgetVsActual({ month, year }) {
  const [expenses, budget] = await Promise.all([
    fetchExpenses(),
    fetchBudgetByMonthYear(month, year),
  ]);

  const actual = (expenses || [])
    .filter((e) => {
      const my = toMonthYear(e.expense_date);
      return my.month === Number(month) && my.year === Number(year);
    })
    .reduce((s, e) => s + Number(e.amount || 0), 0);

  const limit = Number(budget?.limit_amount || 0);
  const percent = limit > 0 ? Math.round((actual / limit) * 100) : 0;

  return { budget, actual, limit, percent };
}

export async function getTrendLastNMonths({ n = 6 }) {
  const expenses = await fetchExpenses();
  const now = new Date();

  // build last n month keys
  const months = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ month: d.getMonth() + 1, year: d.getFullYear(), key: fmtMonthKey(d.getMonth() + 1, d.getFullYear()) });
  }

  const map = new Map(months.map((m) => [m.key, 0]));
  for (const e of expenses || []) {
    const { month, year } = toMonthYear(e.expense_date);
    const key = fmtMonthKey(month, year);
    if (map.has(key)) map.set(key, map.get(key) + Number(e.amount || 0));
  }

  const rows = months.map((m) => ({ ...m, total: map.get(m.key) || 0 }));
  return { rows };
}

export async function getPeriodicTotals({ year }) {
  // quarterly totals for a year
  const expenses = await fetchExpenses();
  const y = Number(year);

  const q = [0, 0, 0, 0];
  for (const e of expenses || []) {
    const d = new Date(e.expense_date);
    const yy = d.getFullYear();
    if (yy !== y) continue;
    const quarter = Math.floor(d.getMonth() / 3); // 0..3
    q[quarter] += Number(e.amount || 0);
  }

  return {
    rows: [
      { period: `Q1/${y}`, total: q[0] },
      { period: `Q2/${y}`, total: q[1] },
      { period: `Q3/${y}`, total: q[2] },
      { period: `Q4/${y}`, total: q[3] },
    ],
    year: y,
  };
}

export async function getTopCategories({ month, year, categories, top = 5 }) {
  const { rows } = await getBreakdownByCategory({ month, year, categories });
  return { rows: rows.slice(0, top) };
}
