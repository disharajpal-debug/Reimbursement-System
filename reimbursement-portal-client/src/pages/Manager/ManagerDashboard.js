import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../shared/dashboard.css";
import "./ManagerDashboard.css";
import SidePanel from "../../shared/components/SidePanel";
import CashPaymentForm from "../../shared/forms/CashPaymentForm";
import LocalTravelForm from "../../shared/forms/LocalTravelForm";
import OutstationTravelForm from "../../shared/forms/OutstationTravelForm";
import VendorPaymentForm from "../../shared/forms/VendorPaymentForm";

// ---------- Helper Functions ----------
const getAllProofs = (req) => {
  let proofs = [];
  if (req.proofs && Array.isArray(req.proofs))
    proofs.push(...req.proofs.filter(Boolean));
  if (req.billImage) proofs.push(req.billImage);
  if (Array.isArray(req.bills)) {
    req.bills.forEach((bill) => {
      if (bill && bill.proof) proofs.push(bill.proof);
    });
  }
  if (Array.isArray(req.expenses)) {
    req.expenses.forEach((exp) => {
      if (exp && exp.proof) proofs.push(exp.proof);
    });
  }
  return [...new Set(proofs.filter(Boolean))];
};

const toProofUrl = (proof) => {
  if (!proof) return "";
  const s = String(proof);
  if (/^https?:\/\//i.test(s)) return s;
  const clean = s
    .replace(/^\/+/, "")
    .replace(/^uploadFiles\//i, "")
    .replace(/\\/g, "/");
  return `http://localhost:5000/${clean}`;
};

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
    (formType || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "-"
  );
};

const getStatusBadge = (status) => {
  if (!status) return "status-badge status-pending";
  const s = status.toLowerCase();
  if (s === "manager_approved" || s === "managerapproved")
    return "status-badge status-approved";
  if (s === "admin_approved") return "status-badge status-admin-approved";
  if (s === "rejected") return "status-badge status-rejected";
  return "status-badge status-pending";
};

const formatStatus = (status) => {
  if (!status) return "Pending";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

// ---------- MAIN COMPONENT ----------
const ManagerDashboard = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamRequests, setTeamRequests] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [selectedForm, setSelectedForm] = useState("dashboard");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [reason, setReason] = useState("");
  const [dashboardTab, setDashboardTab] = useState("team"); // 'team' or 'my-requests'

  const token = localStorage.getItem("token");

  // ---------- FETCH CURRENT USER ----------
  const fetchCurrentUser = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(res.data);
    } catch (err) {
      console.error("Error fetching current user:", err);
    }
  };

  // ---------- FETCH MANAGER DASHBOARD DATA ----------
  const fetchDashboardData = async () => {
    setLoadingRequests(true);
    try {
      console.log("Fetching manager dashboard data...");
      const res = await axios.get(
        "http://localhost:5000/api/employee/manager/dashboard",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("API Response:", res.data);
      console.log("Response success:", res.data.success);
      console.log("Response data:", res.data.data);

      if (res.data.success) {
        const teamMembersData = res.data.data.teamMembers || [];
        const statsData = res.data.data.stats || {};

        console.log("Team Members:", teamMembersData);
        console.log("Stats:", statsData);

        setTeamMembers(teamMembersData);
        setDashboardStats(statsData);

        // Combine all team requests
        const allRequests = [];
        const reqs = res.data.data.requests || {};

        [
          ...(reqs.reimbursements || []),
          ...(reqs.cashPayments || []),
          ...(reqs.localTravel || []),
          ...(reqs.outstationTravel || []),
          ...(reqs.vendorPayments || []),
          ...(reqs.vouchers || []),
        ].forEach((req) => {
          allRequests.push({
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
            userId: req.userId || req.user?.id || req.employeeId,
            _id: req.id || req._id,
          });
        });

        console.log("Processed Team Requests:", allRequests.length);

        setTeamRequests(
          allRequests.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
          })
        );

        // Process manager's own requests
        const myRequestsData = res.data.data.myRequests || {};
        console.log("My Requests Data:", myRequestsData);

        const allMyRequests = [];
        [
          ...(myRequestsData.reimbursements || []),
          ...(myRequestsData.cashPayments || []),
          ...(myRequestsData.localTravel || []),
          ...(myRequestsData.outstationTravel || []),
          ...(myRequestsData.vendorPayments || []),
          ...(myRequestsData.vouchers || []),
        ].forEach((req) => {
          allMyRequests.push({
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
            userId: req.userId || req.user?.id || req.employeeId,
            _id: req.id || req._id,
          });
        });

        console.log("Processed My Requests:", allMyRequests.length);

        setMyRequests(
          allMyRequests.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
          })
        );
      } else {
        console.error("API response indicates failure:", res.data);
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      console.error("Error details:", err.response?.data || err.message);
      setTeamRequests([]);
      setMyRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  // ---------- HANDLE APPROVAL/REJECTION ----------
  const handleActionClick = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setReason("");
    setShowActionModal(true);
  };

  const handleActionSubmit = async () => {
    if (!selectedRequest || !actionType) return;

    setActionLoadingId(selectedRequest._id);
    try {
      const formType = selectedRequest.formType;
      let endpoint = "";

      // Determine endpoint based on form type
      switch (formType) {
        case "reimbursement":
          endpoint = `/api/reimbursements/${selectedRequest._id}/decision`;
          await axios.patch(
            `http://localhost:5000${endpoint}`,
            {
              action: actionType === "approve" ? "approved" : "rejected",
              reason: reason,
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        case "cash_payment":
          endpoint = `/api/cash-payment/${selectedRequest._id}/manager-action`;
          await axios.put(
            `http://localhost:5000${endpoint}`,
            { action: actionType, reason: reason },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        case "local_travel":
          endpoint = `/api/local-travel/${selectedRequest._id}/manager-action`;
          await axios.put(
            `http://localhost:5000${endpoint}`,
            { action: actionType, reason: reason },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        case "outstation_travel":
          endpoint = `/api/outstation-travel/${selectedRequest._id}/manager-action`;
          await axios.put(
            `http://localhost:5000${endpoint}`,
            { action: actionType, reason: reason },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        case "vendor_payment":
          endpoint = `/api/vendor-payments/${selectedRequest._id}/manager-action`;
          await axios.put(
            `http://localhost:5000${endpoint}`,
            { action: actionType, reason: reason },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        case "voucher":
          endpoint = `/api/vouchers/${selectedRequest._id}/manager-action`;
          await axios.put(
            `http://localhost:5000${endpoint}`,
            { action: actionType, reason: reason },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          break;
        default:
          throw new Error("Unknown form type");
      }

      // Refresh data
      await fetchDashboardData();
      setShowActionModal(false);
      setSelectedRequest(null);
      setActionType(null);
      setReason("");
    } catch (err) {
      alert(
        "Failed to submit action: " +
          (err?.response?.data?.error || err.message)
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // ---------- INITIAL LOAD ----------
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  // ---------- LOGOUT ----------
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  // ---------- RENDER ----------
  const renderSelectedForm = () => {
    const formProps = { loggedInUser: currentUser };
    switch (selectedForm) {
      case "cash-payment":
        return <CashPaymentForm {...formProps} />;
      case "local-travel":
        return <LocalTravelForm {...formProps} />;
      case "outstation-travel":
        return <OutstationTravelForm {...formProps} />;
      case "vendor-payment":
        return <VendorPaymentForm {...formProps} />;
      default:
        return renderDashboard();
    }
  };

  // ---------- RENDER REQUEST TABLE ----------
  const renderRequestTable = (requests, showActions = false) => {
    return (
      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Form Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Proofs</th>
              {showActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {requests.map((req, i) => {
              const isPending =
                req.status === "pending" || req.status?.includes("pending");
              return (
                <tr key={`request-${req.formType}-${req._id || i}`}>
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
                    <span className={getStatusBadge(req.status)}>
                      {formatStatus(req.status)}
                    </span>
                  </td>
                  <td>
                    {req.createdAt
                      ? new Date(req.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "-"}
                  </td>
                  <td>
                    {getAllProofs(req).length > 0 ? (
                      <a
                        href={toProofUrl(getAllProofs(req)[0])}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: "13px",
                          textDecoration: "underline",
                        }}
                      >
                        View ({getAllProofs(req).length})
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  {showActions && (
                    <td>
                      {isPending ? (
                        <>
                          <button
                            className="button"
                            disabled={actionLoadingId === req._id}
                            style={{
                              marginRight: 8,
                              background: "#28a745",
                              fontSize: "12px",
                              padding: "6px 12px",
                            }}
                            onClick={() => handleActionClick(req, "approve")}
                          >
                            Approve
                          </button>
                          <button
                            className="button"
                            disabled={actionLoadingId === req._id}
                            style={{
                              background: "#dc3545",
                              fontSize: "12px",
                              padding: "6px 12px",
                            }}
                            onClick={() => handleActionClick(req, "reject")}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: "12px", color: "#666" }}>
                          {formatStatus(req.status)}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // ---------- DASHBOARD ----------
  const renderDashboard = () => {
    if (!currentUser) return <div>Loading...</div>;

    const pendingRequests = teamRequests.filter(
      (r) => r.status === "pending" || r.status?.includes("pending")
    );
    const managerApprovedRequests = teamRequests.filter(
      (r) =>
        r.status === "manager_approved" ||
        r.status === "managerApproved" ||
        r.status === "manager_approved"
    );

    return (
      <div className="manager-dashboard-section">
        <div style={{ marginBottom: "30px" }}>
          <h2>Welcome, {currentUser?.name || "Manager"}!</h2>
          <p style={{ color: "#666", marginTop: "8px" }}>
            {currentUser?.email && <span>Email: {currentUser.email}</span>}
          </p>
        </div>

        {/* STATS */}
        <div className="stats-container">
          <div className="stat-card">
            <h3>Team Members</h3>
            <p>{dashboardStats?.teamMembers ?? teamMembers.length ?? 0}</p>
          </div>
          <div className="stat-card">
            <h3>Total Requests</h3>
            <p>{dashboardStats?.totalRequests ?? teamRequests.length ?? 0}</p>
          </div>
          <div className="stat-card">
            <h3>Pending</h3>
            <p>{dashboardStats?.pending ?? pendingRequests.length ?? 0}</p>
          </div>
          <div className="stat-card">
            <h3>Approved</h3>
            <p>
              {dashboardStats?.approved ?? managerApprovedRequests.length ?? 0}
            </p>
          </div>
        </div>

        {/* TEAM MEMBERS TABLE */}
        {teamMembers.length > 0 && (
          <div className="team-table" style={{ marginTop: "30px" }}>
            <h3>Team Members ({teamMembers.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((m, index) => (
                  <tr key={`team-${m.id || m._id || index}`}>
                    <td>{m.name}</td>
                    <td>{m.email}</td>
                    <td>{m.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TABS FOR TEAM REQUESTS VS MY REQUESTS */}
        <div style={{ marginTop: "40px" }}>
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginBottom: "20px",
              borderBottom: "2px solid #ddd",
            }}
          >
            <button
              onClick={() => setDashboardTab("team")}
              style={{
                padding: "10px 20px",
                background: dashboardTab === "team" ? "#2980b9" : "transparent",
                color: dashboardTab === "team" ? "white" : "#666",
                border: "none",
                borderBottom:
                  dashboardTab === "team"
                    ? "3px solid #2980b9"
                    : "3px solid transparent",
                cursor: "pointer",
                fontWeight: dashboardTab === "team" ? "bold" : "normal",
                borderRadius: "4px 4px 0 0",
              }}
            >
              Team Requests ({teamRequests.length})
            </button>
            <button
              onClick={() => setDashboardTab("my-requests")}
              style={{
                padding: "10px 20px",
                background:
                  dashboardTab === "my-requests" ? "#2980b9" : "transparent",
                color: dashboardTab === "my-requests" ? "white" : "#666",
                border: "none",
                borderBottom:
                  dashboardTab === "my-requests"
                    ? "3px solid #2980b9"
                    : "3px solid transparent",
                cursor: "pointer",
                fontWeight: dashboardTab === "my-requests" ? "bold" : "normal",
                borderRadius: "4px 4px 0 0",
              }}
            >
              My Requests ({myRequests.length})
            </button>
          </div>

          {/* TEAM REQUESTS TAB */}
          {dashboardTab === "team" && (
            <>
              <h3 style={{ margin: "0 0 20px 0" }}>Team Requests</h3>
              {loadingRequests ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ fontSize: "24px", marginBottom: "10px" }}>
                    ⏳
                  </div>
                  <p>Loading team requests...</p>
                </div>
              ) : teamRequests.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "10px" }}>
                    📝
                  </div>
                  <p style={{ fontSize: "18px", color: "#666" }}>
                    No team requests found.
                  </p>
                </div>
              ) : (
                renderRequestTable(teamRequests, true)
              )}
            </>
          )}

          {/* MY REQUESTS TAB */}
          {dashboardTab === "my-requests" && (
            <>
              <h3 style={{ margin: "0 0 20px 0" }}>My Requests</h3>
              <p style={{ color: "#666", marginBottom: "20px" }}>
                These are your own requests. They go directly to admin for
                approval.
              </p>
              {loadingRequests ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ fontSize: "24px", marginBottom: "10px" }}>
                    ⏳
                  </div>
                  <p>Loading your requests...</p>
                </div>
              ) : myRequests.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    background: "#f8f9fa",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "10px" }}>
                    📝
                  </div>
                  <p style={{ fontSize: "18px", color: "#666" }}>
                    No requests submitted yet.
                  </p>
                  <p style={{ color: "#999", marginTop: "8px" }}>
                    Submit a form from the side panel to get started.
                  </p>
                </div>
              ) : (
                renderRequestTable(myRequests, false)
              )}
            </>
          )}
        </div>
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
      <div className="dashboard-content">{renderSelectedForm()}</div>

      {/* ACTION MODAL */}
      {showActionModal && selectedRequest && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: 30,
              borderRadius: 8,
              maxWidth: 500,
              width: "90%",
            }}
          >
            <h3>{actionType === "approve" ? "Approve" : "Reject"} Request</h3>
            <p>
              <strong>Form Type:</strong> {selectedRequest._formTypeLabel}
            </p>
            <p>
              <strong>Employee:</strong> {selectedRequest.employeeName}
            </p>
            <p>
              <strong>Amount:</strong> ₹
              {typeof selectedRequest.amount === "number"
                ? selectedRequest.amount.toLocaleString("en-IN")
                : selectedRequest.amount}
            </p>
            <div style={{ marginTop: 20 }}>
              <label>
                <strong>
                  {actionType === "approve" ? "Approval" : "Rejection"} Reason
                  (Optional):
                </strong>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  actionType === "approve"
                    ? "Add approval remarks..."
                    : "Add rejection reason..."
                }
                style={{
                  width: "100%",
                  minHeight: 100,
                  marginTop: 8,
                  padding: 10,
                  border: "1px solid #ddd",
                  borderRadius: 4,
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 20,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedRequest(null);
                  setActionType(null);
                  setReason("");
                }}
                style={{
                  padding: "8px 16px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                disabled={actionLoadingId === selectedRequest._id}
                style={{
                  padding: "8px 16px",
                  background: actionType === "approve" ? "#28a745" : "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                {actionLoadingId === selectedRequest._id
                  ? "Processing..."
                  : actionType === "approve"
                  ? "Approve"
                  : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
