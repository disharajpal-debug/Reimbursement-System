import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManagerDashboard from "./pages/Manager/UpdatedManagerDashboard";
import EmployeeHome from "./pages/employeedashboard/EmployeeHome";
import UserManagement from "./pages/admin/users/UserManagement";
import VoucherApproval from "./pages/admin/Vouchers/VoucherApproval";
import { isAuthenticated, getRole } from "./utils/auth";

// 🔒 Wrapper for protected routes
function PrivateRoute({ children, role }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  if (role && getRole() !== role) {
    return <Navigate to="/" />;
  }
  return children;
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Employee Dashboard */}
      <Route
        path="/employee-dashboard"
        element={
          <PrivateRoute role="employee">
            <EmployeeHome />
          </PrivateRoute>
        }
      />

      {/* Manager Dashboard */}
      <Route
        path="/manager-dashboard"
        element={
          <PrivateRoute role="manager">
            <ManagerDashboard />
          </PrivateRoute>
        }
      />

      {/* Admin Dashboard with nested routes */}
      <Route
        path="/admin-dashboard"
        element={
          <PrivateRoute role="admin">
            <AdminDashboard />
          </PrivateRoute>
        }
      />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
