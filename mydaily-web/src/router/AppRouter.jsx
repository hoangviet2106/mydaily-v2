import { Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "../pages/LandingPage";
import Login from "../auth/Login";
import Register from "../auth/Register";
import RequireAuth from "../auth/RequireAuth";
import OAuthCallback from "../auth/OAuthCallback";
import DashboardLayout from "../layout/DashboardLayout";
import DashboardHome from "../pages/DashboardHome";
import ExpensesPage from "../pages/ExpensesPage";
import BudgetsPage from "../pages/BudgetsPage";
import ReportsPage from "../pages/ReportsPage";
import CategoriesPage from "../pages/CategoriesPage";
import ExportPage from "../pages/ExportPage";
import TasksPage from "../pages/TasksPage";
import TaskReportsPage from "../pages/TaskReportsPage";
import ProfilePage from "../pages/ProfilePage";
import RequireAdmin from "../auth/RequireAdmin";
import AdminUsersPage from "../pages/admin/AdminUsersPage";


function PublicOnly({ children }) {
  const token = localStorage.getItem("token");
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function AppRouter() {
  const hasToken = !!localStorage.getItem("token");

  return (
    <Routes>
      <Route path="/"
        element={hasToken ? <Navigate to="/dashboard" replace /> : <LandingPage />}/>
      <Route path="/oauth/callback" element={<OAuthCallback />} />

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

      {/* Protected app */}
      <Route
        element={
          <RequireAuth>
            <DashboardLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardHome />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/task-reports" element={<TaskReportsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
          <Route
    path="/admin/users"
    element={
      <RequireAdmin>
        <AdminUsersPage />
      </RequireAdmin>
    }
  />
      </Route>

      {/* fallback */}
      <Route
        path="*"
        element={<Navigate to={hasToken ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}
