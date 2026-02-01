import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    config.headers = config.headers || {};
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

let _handling401 = false;

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      localStorage.removeItem("token");

      const path = window.location.pathname;
      const isAuthPage = path === "/login" || path === "/register";

      if (!isAuthPage && !_handling401) {
        _handling401 = true;

        // fallback: tối thiểu phải có thông báo
        // eslint-disable-next-line no-alert
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");

        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
