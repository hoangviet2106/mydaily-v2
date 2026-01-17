import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../auth/Login";
import Register from "../auth/Register";
import Dashboard from "../dashboard/Dashboard";
import RequireAuth from "../auth/RequireAuth";

function PublicOnly({ children }) {
  const token = localStorage.getItem("token");
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={
            <PublicOnly>
              <Login />
            </PublicOnly>
          }
        />

        <Route
          path="/register"
          element={
            <PublicOnly>
              <Register />
            </PublicOnly>
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
