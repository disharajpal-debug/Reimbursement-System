import React, { useState, useEffect } from "react";
import axios from "axios";
import CashPaymentForm from "../../shared/forms/CashPaymentForm";
import LocalTravelForm from "../../shared/forms/LocalTravelForm";
import OutstationTravelForm from "../../shared/forms/OutstationTravelForm";
import VendorPaymentForm from "../../shared/forms/VendorPaymentForm";
import SidePanel from "../../shared/components/SidePanel";
import "../../shared/dashboard.css";

const UpdatedManagerDashboard = () => {
  // State Management
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedForm, setSelectedForm] = useState("dashboard");
  const [teamRequests, setTeamRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showProofsModal, setShowProofsModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [actionReason, setActionReason] = useState("");
  const [processingAction, setProcessingAction] = useState(false);
  const [activeTab, setActiveTab] = useState("team");

  const token = localStorage.getItem("token");

  // Helper Functions
  const formTypeLabel = (formType) => {
    const map = {
      cash_payment: "Cash Payment",
      local_travel: "Local Travel",
      outstation_travel: "Outstation Travel",
      vendor_payment: "Vendor Payment",
      reimbursement: "Reimbursement",
      voucher: "Voucher",
    };
    return (
      map[formType?.toLowerCase()] ||
      formType?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
      "-"
    );
  };

  // Fetch current user details
  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(res.data);
    } catch (err) {
      console.error("Error fetching user details:", err);
      setFetchError("Failed to fetch user details");
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    setLoadingRequests(true);
    setFetchError(null);
    try {
      console.log("Fetching dashboard data with token:", token);
      const response = await axios.get(
        "http://localhost:5000/api/employee/manager/dashboard",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Dashboard API response:", response.data);

      if (response.data.success) {
        const data = response.data.data;

        // Process team requests
        const requests = data.requests || {};
        const allTeamRequests = [
          ...(requests?.reimbursements || []).map((r) => ({
            ...r,
            formType: "reimbursement",
          })),
          ...(requests?.cashPayments || []).map((r) => ({
            ...r,
            formType: "cash_payment",
          })),
          ...(requests?.localTravel || []).map((r) => ({
            ...r,
            formType: "local_travel",
          })),
          ...(requests?.outstationTravel || []).map((r) => ({
            ...r,
            formType: "outstation_travel",
          })),
          ...(requests?.vendorPayments || []).map((r) => ({
            ...r,
            formType: "vendor_payment",
          })),
          ...(requests?.vouchers || []).map((r) => ({
            ...r,
            formType: "voucher",
          })),
        ].map((req) => ({
          ...req,
          _formTypeLabel: formTypeLabel(req.formType),
          amount:
            req.amount ||
            req.totalAmount ||
            req.totalExpenses ||
            req.grandTotal ||
            0,
          status: req.status || "pending",
          createdAt: req.createdAt || req.submittedAt,
          employeeName:
            req.user?.name ||
            req.employee?.name ||
            req.employeeName ||
            "Unknown",
        }));

        // Process my requests
        const myRequests = data.myRequests || {};
        const allMyRequests = [
          ...(myRequests?.reimbursements || []).map((r) => ({
            ...r,
            formType: "reimbursement",
          })),
          ...(myRequests?.cashPayments || []).map((r) => ({
            ...r,
            formType: "cash_payment",
          })),
          ...(myRequests?.localTravel || []).map((r) => ({
            ...r,
            formType: "local_travel",
          })),
          ...(myRequests?.outstationTravel || []).map((r) => ({
            ...r,
            formType: "outstation_travel",
          })),
          ...(myRequests?.vendorPayments || []).map((r) => ({
            ...r,
            formType: "vendor_payment",
          })),
          ...(myRequests?.vouchers || []).map((r) => ({
            ...r,
            formType: "voucher",
          })),
        ].map((req) => ({
          ...req,
          _formTypeLabel: formTypeLabel(req.formType),
          amount:
            req.amount ||
            req.totalAmount ||
            req.totalExpenses ||
            req.grandTotal ||
            0,
          status: req.status || "pending",
          createdAt: req.createdAt || req.submittedAt,
        }));

        setTeamRequests(
          allTeamRequests.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        );
        setMyRequests(
          allMyRequests.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        );
        setDashboardStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setFetchError(
        err.response?.data?.error || "Failed to fetch dashboard data"
      );
    } finally {
      setLoadingRequests(false);
    }
  };

  // Handle request action
  const handleActionClick = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setActionReason("");
    setShowActionModal(true);
  };

  // Submit action
  const handleActionSubmit = async () => {
    if (!selectedRequest || !actionType) return;

    setProcessingAction(true);
    try {
      const formType = selectedRequest.formType;
      let endpoint = "";
      const action = actionType === "approve" ? "approved" : "rejected";

      switch (formType) {
        case "reimbursement":
          endpoint = `/api/reimbursements/${selectedRequest._id}/decision`;
          await axios.patch(
            `http://localhost:5000${endpoint}`,
            { action, reason: actionReason },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        case "cash_payment":
          endpoint = `/api/cash-payment/${selectedRequest._id}/manager-action`;
          await axios.put(
            `http://localhost:5000${endpoint}`,
            { action: actionType, reason: actionReason },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        case "local_travel":
          endpoint = `/api/local-travel/${selectedRequest._id}/manager-action`;
          await axios.put(
            `http://localhost:5000${endpoint}`,
            { action: actionType, reason: actionReason },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        case "outstation_travel":
          endpoint = `/api/outstation-travel/${selectedRequest._id}/manager-action`;
          await axios.put(
            `http://localhost:5000${endpoint}`,
            { action: actionType, reason: actionReason },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        case "vendor_payment":
          endpoint = `/api/vendor-payments/${selectedRequest._id}/manager-action`;
          await axios.put(
            `http://localhost:5000${endpoint}`,
            { action: actionType, reason: actionReason },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        case "voucher":
          endpoint = `/api/vouchers/${selectedRequest._id}/manager-action`;
          await axios.put(
            `http://localhost:5000${endpoint}`,
            { action: actionType, reason: actionReason },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        default:
          throw new Error("Unknown form type");
      }

      await fetchDashboardData();
      setShowActionModal(false);
      setSelectedRequest(null);
      setActionType(null);
      setActionReason("");
    } catch (error) {
      alert(
        "Failed to process action: " +
          (error.response?.data?.error || error.message)
      );
    } finally {
      setProcessingAction(false);
    }
  };

  // Proofs handling
  const getAllProofs = (req) => {
    const proofs = new Set();
    const add = (p) => p && proofs.add(String(p).trim());

    if (Array.isArray(req.proofs)) req.proofs.forEach(add);
    if (req.billImage) add(req.billImage);
    if (req.proof) add(req.proof);
    if (Array.isArray(req.bills))
      req.bills.forEach((b) => b?.proof && add(b.proof));
    if (Array.isArray(req.expenses))
      req.expenses.forEach((e) => e?.proof && add(e.proof));
    if (Array.isArray(req.items))
      req.items.forEach((i) => i?.proof && add(i.proof));
    if (Array.isArray(req.attachments)) req.attachments.forEach(add);

    return [...proofs];
  };

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

  const viewProofs = (req) => {
    setSelectedRequest(req);
    setShowProofsModal(true);
  };

  // Initial data load
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  // Logout handler
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Render functions
  const renderForm = () => {
    const props = { loggedInUser: currentUser };
    switch (selectedForm) {
      case "cash-payment":
        return <CashPaymentForm {...props} />;
      case "local-travel":
        return <LocalTravelForm {...props} />;
      case "outstation-travel":
        return <OutstationTravelForm {...props} />;
      case "vendor-payment":
        return <VendorPaymentForm {...props} />;
      case "dashboard":
      default:
        return renderDashboard();
    }
  };

  const getStatusClass = (status) => {
    if (!status) return "status-pending";
    const s = status.toLowerCase();
    if (s.includes("approved")) return "status-approved";
    if (s.includes("rejected")) return "status-rejected";
    return "status-pending";
  };

  const formatStatus = (status) => {
    if (!status) return "Pending";
    return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const renderDashboard = () => {
    const requests = activeTab === "team" ? teamRequests : myRequests;
    const filterByStatus = (reqs, statusType) => {
      if (!Array.isArray(reqs)) return [];
      return reqs.filter((r) => {
        const status = (r.status || "").toLowerCase();
        switch (statusType) {
          case "pending":
            return status === "pending" || status.includes("pending");
          case "approved":
            return status.includes("approved");
          case "rejected":
            return status.includes("rejected");
          default:
            return false;
        }
      });
    };

    const pendingRequests = filterByStatus(requests, "pending");
    const approvedRequests = filterByStatus(requests, "approved");
    const rejectedRequests = filterByStatus(requests, "rejected");

    const calculateAmount = (reqs) => {
      if (!Array.isArray(reqs)) return 0;
      return reqs.reduce((sum, r) => {
        const amount =
          typeof r.amount === "number"
            ? r.amount
            : typeof parseFloat(r.amount) === "number"
            ? parseFloat(r.amount)
            : 0;
        return sum + amount;
      }, 0);
    };

    const totalAmount = calculateAmount(requests);
    const pendingAmount = calculateAmount(pendingRequests);
    const approvedAmount = calculateAmount(approvedRequests);

    return (
      <div className="section">
        {/* Header */}
        <div style={{ marginBottom: "30px" }}>
          <h2>Welcome, {currentUser?.name || "Manager"}!</h2>
          <p style={{ color: "#666", marginTop: "8px" }}>
            {currentUser?.email && <span>Email: {currentUser.email}</span>}
          </p>
        </div>

        {/* Error Message */}
        {fetchError && (
          <div
            style={{
              background: "#ffe6e6",
              color: "#b71c1c",
              padding: 12,
              borderRadius: 6,
              margin: "16px 0",
              fontWeight: "bold",
            }}
          >
            {fetchError}
          </div>
        )}

        {/* Stats Grid */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "30px",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "Team Members",
              value: dashboardStats?.teamMembers || 0,
              color: "#2c3e50",
              icon: "👥",
            },
            {
              label: "Total Requests",
              value: requests.length,
              color: "#3498db",
              icon: "📋",
            },
            {
              label: "Pending",
              value: pendingRequests.length,
              color: "#e67e22",
              icon: "⏳",
            },
            {
              label: "Approved",
              value: approvedRequests.length,
              color: "#27ae60",
              icon: "✅",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: "1",
                minWidth: "200px",
                padding: "20px",
                background: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                {stat.icon}
              </div>
              <h3 style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                {stat.label}
              </h3>
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: stat.color,
                  margin: "8px 0 0",
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Amount Stats */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "30px",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "Total Amount",
              value: `₹${totalAmount.toLocaleString("en-IN")}`,
              color: "#2c3e50",
              icon: "💰",
            },
            {
              label: "Pending Amount",
              value: `₹${pendingAmount.toLocaleString("en-IN")}`,
              color: "#e67e22",
              icon: "⏳",
            },
            {
              label: "Approved Amount",
              value: `₹${approvedAmount.toLocaleString("en-IN")}`,
              color: "#27ae60",
              icon: "✅",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: "1",
                minWidth: "250px",
                padding: "20px",
                background: "white",
                borderRadius: "8px",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                {stat.icon}
              </div>
              <h3 style={{ margin: "0", color: "#666", fontSize: "14px" }}>
                {stat.label}
              </h3>
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: stat.color,
                  margin: "8px 0 0",
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: "20px", borderBottom: "2px solid #eee" }}>
          <button
            className={`tab-button ${activeTab === "team" ? "active" : ""}`}
            onClick={() => setActiveTab("team")}
          >
            Team Requests
          </button>
          <button
            className={`tab-button ${activeTab === "my" ? "active" : ""}`}
            onClick={() => setActiveTab("my")}
          >
            My Requests
          </button>
        </div>

        {/* Requests Table */}
        {loadingRequests ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>⏳</div>
            <p>Loading requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              background: "#f8f9fa",
              borderRadius: "8px",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "10px" }}>📝</div>
            <p style={{ fontSize: "18px", color: "#666" }}>
              No requests found.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Form Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req._id || req.id}>
                    <td>
                      <strong>{req.employeeName}</strong>
                    </td>
                    <td>{req._formTypeLabel}</td>
                    <td>
                      <strong>
                        ₹
                        {typeof req.amount === "number"
                          ? req.amount.toLocaleString("en-IN")
                          : req.amount}
                      </strong>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${getStatusClass(req.status)}`}
                      >
                        {formatStatus(req.status)}
                      </span>
                    </td>
                    <td>
                      {new Date(req.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {activeTab === "team" &&
                          (req.status === "pending" ||
                            req.status?.includes("pending")) && (
                            <>
                              <button
                                className="button approve-button"
                                onClick={() =>
                                  handleActionClick(req, "approve")
                                }
                                disabled={processingAction}
                              >
                                Approve
                              </button>
                              <button
                                className="button reject-button"
                                onClick={() => handleActionClick(req, "reject")}
                                disabled={processingAction}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        {getAllProofs(req).length > 0 && (
                          <button
                            onClick={() => viewProofs(req)}
                            className="button"
                            style={{ fontSize: "12px", padding: "6px 12px" }}
                          >
                            📎 Proofs ({getAllProofs(req).length})
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <SidePanel
        selectedForm={selectedForm}
        setSelectedForm={setSelectedForm}
        userRole="manager"
        onLogout={handleLogout}
      />

      <div className="dashboard-content">{renderForm()}</div>

      {/* Action Modal */}
      {showActionModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{actionType === "approve" ? "Approve" : "Reject"} Request</h2>
            <div className="modal-body">
              <p>
                <strong>Form Type:</strong> {selectedRequest._formTypeLabel}
              </p>
              <p>
                <strong>Employee:</strong> {selectedRequest.employeeName}
              </p>
              <p>
                <strong>Amount:</strong> ₹
                {selectedRequest.amount.toLocaleString("en-IN")}
              </p>

              <label>
                {actionType === "approve" ? "Approval" : "Rejection"} Reason:
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={`Enter ${actionType} reason...`}
              />
            </div>
            <div className="modal-footer">
              <button
                className="button"
                onClick={() => setShowActionModal(false)}
                disabled={processingAction}
              >
                Cancel
              </button>
              <button
                className={`button ${
                  actionType === "approve" ? "approve-button" : "reject-button"
                }`}
                onClick={handleActionSubmit}
                disabled={processingAction}
              >
                {processingAction
                  ? "Processing..."
                  : actionType === "approve"
                  ? "Approve"
                  : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proofs Modal */}
      {showProofsModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Proofs - {selectedRequest._formTypeLabel}</h2>
            <div className="modal-body">
              <p>
                <strong>Amount:</strong> ₹
                {selectedRequest.amount.toLocaleString("en-IN")}
              </p>
              <p>
                <strong>Status:</strong> {formatStatus(selectedRequest.status)}
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                {getAllProofs(selectedRequest).map((proof, i) => (
                  <div
                    key={i}
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px",
                      borderRadius: "4px",
                    }}
                  >
                    <img
                      src={toProofUrl(proof)}
                      alt=""
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
                        textAlign: "center",
                        padding: "8px",
                      }}
                    >
                      <a
                        href={toProofUrl(proof)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View File
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="button"
                onClick={() => {
                  setShowProofsModal(false);
                  setSelectedRequest(null);
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

export default UpdatedManagerDashboard;
