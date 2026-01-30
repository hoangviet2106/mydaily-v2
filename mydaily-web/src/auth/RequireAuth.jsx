import { Navigate, useLocation } from "react-router-dom";

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload?.exp) return false; // nếu không có exp thì coi như chưa expired
    return Date.now() >= payload.exp * 1000;
  } catch {
    return true; // token hỏng -> coi như expired
  }
}

export default function RequireAuth({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
