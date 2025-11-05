import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <strong style={{ color: "white" }}>Reimbursement Portal</strong>
        </div>

        <div
          className="nav-links"
          style={{ display: "flex", gap: "12px", alignItems: "center" }}
        >
          {!role && (
            <Link to="/" style={{ color: "white" }}>
              Home
            </Link>
          )}

          {role === "employee" && (
            <>
              <Link to="/employee" style={{ color: "white" }}>
                Dashboard
              </Link>
              <Link to="/employee" style={{ color: "white" }}>
                My Requests
              </Link>
            </>
          )}

          {role === "manager" && (
            <>
              <Link to="/manager" style={{ color: "white" }}>
                Dashboard
              </Link>
              <Link to="/manager" style={{ color: "white" }}>
                Approve Requests
              </Link>
              <Link to="/manager" style={{ color: "white" }}>
                Reports
              </Link>
            </>
          )}

          {role === "admin" && (
            <>
              <Link to="/admin" style={{ color: "white" }}>
                Dashboard
              </Link>
              <Link to="/admin" style={{ color: "white" }}>
                Manage Users
              </Link>
              <Link to="/admin" style={{ color: "white" }}>
                Reports
              </Link>
            </>
          )}

          {role && (
            <button
              onClick={handleLogout}
              style={{
                background: "#ff4d4f",
                color: "white",
                border: "none",
                padding: "8px 12px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
