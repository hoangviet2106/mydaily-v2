import api from "./axios";

export async function fetchCategories() {
  const res = await api.get("/categories");
  return res.data; // array
}

export async function createCategory(payload) {
  // payload: { name }
  const res = await api.post("/categories", payload);
  return res.data; // category
}

export async function updateCategory(id, payload) {
  const res = await api.patch(`/categories/${id}`, payload);
  return res.data; // category
}

export async function deleteCategory(id) {
  const res = await api.delete(`/categories/${id}`);
  return res.data; // { message } or something
}
