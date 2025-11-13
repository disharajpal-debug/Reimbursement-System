import React, { useState, useEffect } from "react";
import API from "../../utils/api";
import SidePanel from "../../shared/components/SidePanel";
import "./AdminDashboard.css";
import "../../shared/dashboard.css";

// Import form components
import CashPaymentForm from "../../shared/forms/CashPaymentForm";
import LocalTravelForm from "../../shared/forms/LocalTravelForm";
import OutstationTravelForm from "../../shared/forms/OutstationTravelForm";
import VendorPaymentForm from "../../shared/forms/VendorPaymentForm";

// Import admin components
import UserManagement from "./UserManagement";
import VoucherApproval from "./Vouchers/VoucherApproval";
import PrintForms from "./PrintForms";
import TransactionLog from "./TransactionLog";

// Import employee home for my requests view
// EmployeeHome is not embedded in admin to avoid nested side panels

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedForm, setSelectedForm] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showProofsModal, setShowProofsModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  // API attaches token automatically via `src/utils/api.js` interceptor

  // Fetch dashboard data from server
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get("/admin/dashboard");
      const data = res.data;
      console.debug("Admin dashboard raw response:", data);
      if (data && data.success) {
        setDashboardData(data.data || null);
      } else if (Array.isArray(data)) {
        // fallback: some endpoints return raw arrays
        setDashboardData({ requests: data });
      } else if (data) {
        // fallback if server returns object without success
        setDashboardData(data.data || data);
      } else {
        setError("Failed to fetch dashboard data");
      }
    } catch (err) {
      console.error("Error fetching admin dashboard:", err);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to fetch dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper: flatten requests from dashboardData into a single array
  const flattenRequests = () => {
    if (!dashboardData || !dashboardData.requests) return [];
    const r = dashboardData.requests;
    // If requests is already an array (backend returned flat list), use it
    if (Array.isArray(r)) {
      return r.map((req) => ({
        ...req,
        formType: req.formType || req.type || (req.form && req.form.type),
        _formTypeLabel:
          req._formTypeLabel ||
          (req.formType || req.type || "").toString().replace(/_/g, " "),
        amount: req.amount || req.totalAmount || req.totalExpenses || 0,
        employeeName:
          req.user?.name || req.employee?.name || req.employeeName || "Unknown",
      }));
    }
    return [
      ...(r.reimbursements || []),
      ...(r.cashPayments || []),
      ...(r.localTravel || []),
      ...(r.outstationTravel || []),
      ...(r.vendorPayments || []),
      ...(r.vouchers || []),
    ].map((req) => ({
      ...req,
      formType: req.formType || req.type || (req.form && req.form.type),
      _formTypeLabel:
        req._formTypeLabel ||
        (req.formType || req.type || "").toString().replace(/_/g, " "),
      amount: req.amount || req.totalAmount || req.totalExpenses || 0,
      employeeName:
        req.user?.name || req.employee?.name || req.employeeName || "Unknown",
    }));
  };

  // Load initial data and set up polling
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  const [currentUser, setCurrentUser] = useState(null);

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await API.get("/users/me");
        const data = response.data;
        // /users/me might return user object directly or { success, data }
        setCurrentUser(data?.data || data);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Render the selected form and pass admin info as prop
  const renderForm = () => {
    switch (selectedForm) {
      case "all-requests":
        return renderAllRequests();
      case "cash-payment":
        return <CashPaymentForm loggedInUser={currentUser} />;
      case "local-travel":
        return <LocalTravelForm loggedInUser={currentUser} />;
      case "outstation-travel":
        return <OutstationTravelForm loggedInUser={currentUser} />;
      case "vendor-payment":
        return <VendorPaymentForm loggedInUser={currentUser} />;
      case "voucher-approval":
        return <VoucherApproval />;
      case "user-management":
        return <UserManagement />;
      case "my-requests":
        return renderMyRequestsAdmin();
      case "print-forms":
        return <PrintForms />;
      case "transaction-log":
        return <TransactionLog />;
      case "dashboard":
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => {
    const allReqs = flattenRequests();
    const totalRequests =
      allReqs.length || dashboardData?.stats?.requests?.total || 0;
    const cashPaymentsCount =
      dashboardData?.stats?.byType?.cashPayments ??
      dashboardData?.stats?.byType?.cash_payment ??
      0;
    const pendingCount =
      dashboardData?.stats?.requests?.pending ??
      dashboardData?.stats?.pending ??
      allReqs.filter((r) => (r.status || "").toLowerCase().includes("pending"))
        .length;
    const usersCount = dashboardData?.users?.length || 0;

    return (
      <div className="section">
        <h2>Welcome, {currentUser?.name || "Admin"}!</h2>
        <p>
          Admin Dashboard - Manage all reimbursement requests and system
          operations.
        </p>

        {/* Stats Cards */}
        <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
          <div
            style={{
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "white",
              flex: 1,
              textAlign: "center",
            }}
          >
            <h3>Total Requests</h3>
            <p
              style={{ fontSize: "24px", fontWeight: "bold", color: "#2c3e50" }}
            >
              {totalRequests}
            </p>
          </div>
          <div
            style={{
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "white",
              flex: 1,
              textAlign: "center",
            }}
          >
            <h3>Cash Payments</h3>
            <p
              style={{ fontSize: "24px", fontWeight: "bold", color: "#2c3e50" }}
            >
              {cashPaymentsCount}
            </p>
          </div>
          <div
            style={{
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "white",
              flex: 1,
              textAlign: "center",
            }}
          >
            <h3>Pending</h3>
            <p
              style={{ fontSize: "24px", fontWeight: "bold", color: "#2c3e50" }}
            >
              {pendingCount}
            </p>
          </div>
          <div
            style={{
              padding: "20px",
              border: "1px solid #ddd",
              borderRadius: "8px",
              background: "white",
              flex: 1,
              textAlign: "center",
            }}
          >
            <h3>Total Users</h3>
            <p
              style={{ fontSize: "24px", fontWeight: "bold", color: "#2c3e50" }}
            >
              {usersCount}
            </p>
          </div>
        </div>

        <h3 style={{ marginTop: "40px" }}>Recent Requests</h3>
        {loading ? (
          <p>Loading...</p>
        ) : allReqs.length === 0 ? (
          <p>No requests submitted yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Form Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Submitted On</th>
              </tr>
            </thead>
            <tbody>
              {allReqs.slice(0, 10).map((req) => (
                <tr key={req.id || req._id}>
                  <td>{req.employeeName || req.user?.name || "-"}</td>
                  <td>
                    {req._formTypeLabel ||
                      (req.formType || req.type || "")
                        .toString()
                        .replace("_", " ")}
                  </td>
                  <td>
                    ₹
                    {typeof req.amount === "number"
                      ? req.amount.toLocaleString("en-IN")
                      : req.amount}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        (req.status || "").toLowerCase().includes("approved")
                          ? "status-approved"
                          : (req.status || "")
                              .toLowerCase()
                              .includes("rejected")
                          ? "status-rejected"
                          : "status-pending"
                      }`}
                    >
                      {req.status || "PENDING"}
                    </span>
                  </td>
                  <td>
                    {req.createdAt
                      ? new Date(req.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderAllRequests = () => {
    const allReqs = flattenRequests();
    return (
      <div className="section">
        <h2>All Requests</h2>
        {loading ? (
          <p>Loading...</p>
        ) : allReqs.length === 0 ? (
          <p>No requests submitted yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Form Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Submitted On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allReqs.map((req) => (
                <tr key={req.id || req._id}>
                  <td>{req.employeeName || req.user?.name || "-"}</td>
                  <td>
                    {req._formTypeLabel ||
                      (req.formType || req.type || "")
                        .toString()
                        .replace("_", " ")}
                  </td>
                  <td>
                    ₹
                    {typeof req.amount === "number"
                      ? req.amount.toLocaleString("en-IN")
                      : req.amount}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        (req.status || "").toLowerCase().includes("approved")
                          ? "status-approved"
                          : (req.status || "")
                              .toLowerCase()
                              .includes("rejected")
                          ? "status-rejected"
                          : "status-pending"
                      }`}
                    >
                      {req.status || "PENDING"}
                    </span>
                  </td>
                  <td>
                    {req.createdAt
                      ? new Date(req.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    {getProofsCount(req) > 0 && (
                      <button
                        onClick={() => viewProofs(req)}
                        className="button"
                        style={{
                          fontSize: "12px",
                          padding: "4px 8px",
                          backgroundColor: "#17a2b8",
                          color: "white",
                        }}
                      >
                        View Proofs ({getProofsCount(req)})
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderMyRequestsAdmin = () => {
    const allReqs = flattenRequests();
    const myReqs = allReqs.filter(
      (r) =>
        (r.user &&
          (r.user.id === currentUser?.id || r.user._id === currentUser?.id)) ||
        r.employeeName === currentUser?.name
    );

    return (
      <div className="section">
        <h2>My Requests</h2>
        {loading ? (
          <p>Loading...</p>
        ) : myReqs.length === 0 ? (
          <p>No requests submitted yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Form Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Submitted On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {myReqs.map((req) => (
                <tr key={req.id || req._id}>
                  <td>{req._formTypeLabel || req.formType}</td>
                  <td>
                    ₹
                    {typeof req.amount === "number"
                      ? req.amount.toLocaleString("en-IN")
                      : req.amount}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        (req.status || "").toLowerCase().includes("approved")
                          ? "status-approved"
                          : (req.status || "")
                              .toLowerCase()
                              .includes("rejected")
                          ? "status-rejected"
                          : "status-pending"
                      }`}
                    >
                      {req.status || "PENDING"}
                    </span>
                  </td>
                  <td>
                    {req.createdAt
                      ? new Date(req.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    {getProofsCount(req) > 0 && (
                      <button
                        onClick={() => viewProofs(req)}
                        className="button"
                        style={{ backgroundColor: "#17a2b8", color: "white" }}
                      >
                        View Proofs ({getProofsCount(req)})
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // Helper function to get proofs count from request
  const getProofsCount = (req) => {
    if (req.proofs && Array.isArray(req.proofs)) {
      return req.proofs.length;
    }
    if (req.bills && Array.isArray(req.bills)) {
      return req.bills.filter((bill) => bill.proof).length;
    }
    if (req.billImage) {
      return 1;
    }
    return 0;
  };

  // Helper function to get all proofs from request
  const getAllProofs = (req) => {
    const proofs = [];

    if (req.proofs && Array.isArray(req.proofs)) {
      proofs.push(...req.proofs);
    }

    if (req.bills && Array.isArray(req.bills)) {
      req.bills.forEach((bill) => {
        if (bill.proof) {
          proofs.push(bill.proof);
        }
      });
    }

    if (req.billImage) {
      proofs.push(req.billImage);
    }

    return proofs;
  };

  // View proofs modal
  const viewProofs = (req) => {
    setSelectedRequest(req);
    setShowProofsModal(true);
  };

  // Normalize proof URLs
  const toProofUrl = (proof) => {
    if (!proof) return "";
    const s = String(proof);
    if (/^https?:\/\//i.test(s)) return s;
    const clean = s
      .replace(/^\/+/, "")
      .replace(/^uploadFiles\//i, "")
      .replace(/\\/g, "/");
    return `http://localhost:5000/uploadFiles/${clean}`;
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  return (
    <div className="dashboard-container">
      {/* SIDE PANEL */}
      <SidePanel
        selectedForm={selectedForm}
        setSelectedForm={setSelectedForm}
        userRole="admin"
        onLogout={handleLogout}
      />

      {/* MAIN CONTENT */}
      <div className="dashboard-content">{renderForm()}</div>

      {/* Proofs Modal */}
      {showProofsModal && selectedRequest && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "8px",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <h3>
              Proofs -{" "}
              {selectedRequest.type ||
                selectedRequest.formType?.replace("_", " ").toUpperCase()}
            </h3>
            <p>
              <strong>Employee:</strong>{" "}
              {selectedRequest.employeeName ||
                selectedRequest.user?.name ||
                "-"}
            </p>
            <p>
              <strong>Amount:</strong> ₹
              {selectedRequest.amount ||
                selectedRequest.totalAmount ||
                selectedRequest.totalExpenses ||
                "-"}
            </p>
            <p>
              <strong>Status:</strong> {selectedRequest.status}
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              {getAllProofs(selectedRequest).map((proof, index) => (
                <div
                  key={index}
                  style={{
                    border: "1px solid #ccc",
                    padding: "8px",
                    borderRadius: "4px",
                  }}
                >
                  <img
                    src={toProofUrl(proof)}
                    alt={`Proof ${index + 1}`}
                    style={{
                      maxWidth: "200px",
                      maxHeight: "200px",
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "block";
                    }}
                  />
                  <div
                    style={{
                      display: "none",
                      padding: "10px",
                      textAlign: "center",
                    }}
                  >
                    <a
                      href={toProofUrl(proof)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Document
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "16px",
              }}
            >
              <button
                onClick={() => {
                  setShowProofsModal(false);
                  setSelectedRequest(null);
                }}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
