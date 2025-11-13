import React from "react";
import "../dashboard.css";

const SidePanel = ({ selectedForm, setSelectedForm, userRole, onLogout }) => {
  const employeeForms = [
    { id: "dashboard", name: "Dashboard", icon: "📊" },
    { id: "cash-payment", name: "Cash Payment", icon: "💰" },
    { id: "local-travel", name: "Local Travel", icon: "🚗" },
    { id: "outstation-travel", name: "Outstation Travel", icon: "✈️" },
    { id: "vendor-payment", name: "Vendor Payment", icon: "🏪" },
    { id: "my-requests", name: "My Requests", icon: "📝" },
  ];

  const managerForms = [
    { id: "dashboard", name: "Dashboard", icon: "📊" },
    { id: "team-requests", name: "Team Requests", icon: "👥" },
    { id: "cash-payment", name: "Cash Payment", icon: "💰" },
    { id: "local-travel", name: "Local Travel", icon: "🚗" },
    { id: "outstation-travel", name: "Outstation Travel", icon: "✈️" },
    { id: "vendor-payment", name: "Vendor Payment", icon: "🏪" },
    { id: "my-requests", name: "My Requests", icon: "📝" },
  ];

  const adminForms = [
    { id: "dashboard", name: "Dashboard", icon: "📊" },
    { id: "all-requests", name: "All Requests", icon: "📝" },
    { id: "cash-payment", name: "Cash Payment", icon: "💰" },
    { id: "local-travel", name: "Local Travel", icon: "🚗" },
    { id: "outstation-travel", name: "Outstation Travel", icon: "✈️" },
    { id: "vendor-payment", name: "Vendor Payment", icon: "🏪" },
    { id: "voucher-approval", name: "Voucher Approval", icon: "✅" },
    { id: "user-management", name: "User Management", icon: "👥" },
    { id: "my-requests", name: "My Requests", icon: "📋" },
    { id: "print-forms", name: "Print Forms", icon: "🖨️" },
    { id: "transaction-log", name: "Transaction Log", icon: "📅" },
  ];

  // Filter forms based on user role
  const getAvailableForms = () => {
    if (userRole === "admin") {
      return adminForms; // Admin sees all forms including admin-specific ones
    } else if (userRole === "manager") {
      return managerForms; // Manager sees employee forms plus approvals
    } else {
      // Employee sees employee forms
      return employeeForms;
    }
  };

  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <h3>Navigation</h3>
      </div>
      <nav className="side-panel-nav">
        {getAvailableForms().map((form) => (
          <button
            key={form.id}
            className={`side-panel-item ${
              selectedForm === form.id ? "active" : ""
            }`}
            onClick={() => setSelectedForm(form.id)}
          >
            <span className="side-panel-icon">{form.icon}</span>
            <span className="side-panel-text">{form.name}</span>
          </button>
        ))}
      </nav>
      <div className="side-panel-footer">
        <button className="side-panel-logout" onClick={onLogout}>
          <span className="side-panel-icon">🚪</span>
          <span className="side-panel-text">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default SidePanel;
