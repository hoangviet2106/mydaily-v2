import api from "./axios";

export async function fetchCategories() {
  const res = await api.get("/categories");
  return res.data;
}
