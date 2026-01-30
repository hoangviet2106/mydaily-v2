import api from "./axios";

export function fetchMe() {
  return api.get("/users/me").then((r) => r.data);
}

export function updateMe(payload) {
  return api.patch("/users/me", payload).then((r) => r.data);
}
