import React, { useState, useEffect } from "react";
import axios from "axios";
import CashPaymentForm from "../../shared/forms/CashPaymentForm";
import LocalTravelForm from "../../shared/forms/LocalTravelForm";
import OutstationTravelForm from "../../shared/forms/OutstationTravelForm";
import VendorPaymentForm from "../../shared/forms/VendorPaymentForm";
import SidePanel from "../../shared/components/SidePanel";
import "../../shared/dashboard.css";

const EmployeeHome = () => {
  const [employee, setEmployee] = useState(null);
  const [selectedForm, setSelectedForm] = useState("dashboard");
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showProofsModal, setShowProofsModal] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setEmployee(JSON.parse(storedUser));
        } else if (token) {
          const res = await axios.get("http://localhost:5000/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setEmployee(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        }
      } catch (err) {
        console.error("Error fetching employee info:", err);
      }
    };
    fetchEmployee();
  }, [token]);

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

  // FETCH DASHBOARD STATISTICS
  useEffect(() => {
    const fetchDashboardStats = async () => {
      setLoadingStats(true);
      try {
        if (!token) return;
        const res = await axios.get(
          "http://localhost:5000/api/employee/dashboard-stats",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.data.success) {
          setDashboardStats(res.data.data);
        }
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchDashboardStats();
  }, [token]);

  // FETCH ALL REQUESTS - USING UPDATED ENDPOINTS
  useEffect(() => {
    const fetchAllEmployeeRequests = async () => {
      setLoadingRequests(true);
      setFetchError(null);
      try {
        if (!token) return;

        const [
          reimbursements,
          cashPayments,
          localTravel,
          outstationTravel,
          vendorPayments,
          vouchers,
        ] = await Promise.all([
          axios
            .get("http://localhost:5000/api/reimbursements/myrequests", {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: [] })),
          axios
            .get("http://localhost:5000/api/cash-payment/my-payments", {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: [] })),
          axios
            .get("http://localhost:5000/api/local-travel", {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { data: [] } })),
          axios
            .get("http://localhost:5000/api/outstation-travel", {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { data: [] } })),
          axios
            .get("http://localhost:5000/api/vendor-payments/my-payments", {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { data: [] } })),
          axios
            .get("http://localhost:5000/api/vouchers/my-vouchers", {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: { data: [] } })),
        ]);

        const safeArray = (res) => {
          const data = res?.data;
          if (Array.isArray(data)) return data;
          if (data?.data && Array.isArray(data.data)) return data.data;
          return [];
        };

        const allRequests = [
          ...safeArray(reimbursements).map((r) => ({
            ...r,
            formType: "reimbursement",
          })),
          ...safeArray(cashPayments).map((r) => ({
            ...r,
            formType: "cash_payment",
          })),
          ...safeArray(localTravel).map((r) => ({
            ...r,
            formType: "local_travel",
          })),
          ...safeArray(outstationTravel).map((r) => ({
            ...r,
            formType: "outstation_travel",
          })),
          ...safeArray(vendorPayments).map((r) => ({
            ...r,
            formType: "vendor_payment",
          })),
          ...safeArray(vouchers).map((r) => ({ ...r, formType: "voucher" })),
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
          reason:
            req.reason ||
            req.managerReason ||
            req.adminReason ||
            req.rejectionReason ||
            "-",
          voucherNo: req.voucherNo || req.voucherNo || "-",
        }));

        setRequests(
          allRequests.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
          })
        );

        if (allRequests.length === 0) {
          setFetchError(null); // Don't show error for empty state
        }
      } catch (err) {
        console.error("Error fetching requests:", err);
        setFetchError("Failed to load requests. Please try again.");
        setRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchAllEmployeeRequests();
  }, [token]);

  // ENHANCED PROOF DETECTION - COVERS ALL FORMS
  const getProofsCount = (req) => {
    const proofs = new Set();
    const add = (p) => p && proofs.add(String(p).trim());

    // Generic
    if (Array.isArray(req.proofs)) req.proofs.forEach(add);
    if (req.billImage) add(req.billImage);
    if (req.proof) add(req.proof);

    // Form-specific
    if (Array.isArray(req.bills))
      req.bills.forEach((b) => b?.proof && add(b.proof));
    if (Array.isArray(req.expenses))
      req.expenses.forEach((e) => e?.proof && add(e.proof));
    if (Array.isArray(req.items))
      req.items.forEach((i) => i?.proof && add(i.proof));
    if (Array.isArray(req.attachments)) req.attachments.forEach(add);

    return proofs.size;
  };

  const getAllProofs = (req) => {
    const proofs = [];
    const add = (p) => p && proofs.push(String(p).trim());

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

    return [...new Set(proofs)];
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

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  const renderForm = () => {
    const props = { loggedInUser: employee };
    switch (selectedForm) {
      case "cash-payment":
        return <CashPaymentForm {...props} />;
      case "local-travel":
        return <LocalTravelForm {...props} />;
      case "outstation-travel":
        return <OutstationTravelForm {...props} />;
      case "vendor-payment":
        return <VendorPaymentForm {...props} />;
      case "my-requests":
        return renderMyRequests();
      case "dashboard":
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => {
    const pendingRequests = requests.filter(
      (r) => r.status === "pending" || r.status?.includes("pending")
    );
    const approvedRequests = requests.filter(
      (r) =>
        r.status === "approved" ||
        r.status === "manager_approved" ||
        r.status === "admin_approved" ||
        r.status === "managerApproved"
    );
    const rejectedRequests = requests.filter(
      (r) => r.status === "rejected" || r.status?.includes("rejected")
    );
    const managerApproved = requests.filter(
      (r) =>
        r.status === "manager_approved" ||
        r.status === "manager_rejected" ||
        r.status === "managerApproved"
    );
    const adminApproved = requests.filter(
      (r) => r.status === "admin_approved" || r.status === "admin_rejected"
    );

    const totalAmount = requests.reduce(
      (sum, r) => sum + (parseFloat(r.amount) || 0),
      0
    );
    const pendingAmount = pendingRequests.reduce(
      (sum, r) => sum + (parseFloat(r.amount) || 0),
      0
    );
    const approvedAmount = approvedRequests.reduce(
      (sum, r) => sum + (parseFloat(r.amount) || 0),
      0
    );

    return (
      <div className="section">
        <div style={{ marginBottom: "30px" }}>
          <h2>Welcome, {employee?.name || "Employee"}!</h2>
          <p style={{ color: "#666", marginTop: "8px" }}>
            {employee?.email && <span>Email: {employee.email}</span>}
            {employee?.role && (
              <span style={{ marginLeft: "20px" }}>
                Role:{" "}
                {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
              </span>
            )}
          </p>
        </div>

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

        {/* STATS */}
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
              label: "Total Requests",
              value: requests.length,
              color: "#2c3e50",
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
              color: "#28a745",
              icon: "✅",
            },
            {
              label: "Rejected",
              value: rejectedRequests.length,
              color: "#dc3545",
              icon: "❌",
            },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 180,
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                background: "white",
                textAlign: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                {stat.icon}
              </div>
              <h3 style={{ margin: "8px 0", fontSize: "16px", color: "#666" }}>
                {stat.label}
              </h3>
              <p
                style={{
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: stat.color,
                  margin: 0,
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* AMOUNT STATS */}
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
              color: "#28a745",
              icon: "✅",
            },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 200,
                padding: "20px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                background: "white",
                textAlign: "center",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>
                {stat.icon}
              </div>
              <h3 style={{ margin: "8px 0", fontSize: "16px", color: "#666" }}>
                {stat.label}
              </h3>
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: stat.color,
                  margin: 0,
                }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* DASHBOARD STATS FROM BACKEND */}
        {dashboardStats && (
          <div
            style={{
              background: "#f8f9fa",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "30px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Quick Statistics</h3>
            <div
              style={{
                display: "flex",
                gap: "20px",
                flexWrap: "wrap",
                marginTop: "15px",
              }}
            >
              <div
                style={{
                  padding: "10px",
                  background: "white",
                  borderRadius: "6px",
                  flex: 1,
                  minWidth: "150px",
                }}
              >
                <strong>By Form Type:</strong>
                <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                  {Object.entries(dashboardStats.byFormType || {}).map(
                    ([type, count]) => (
                      <li key={type} style={{ margin: "4px 0" }}>
                        {formTypeLabel(type)}: <strong>{count}</strong>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* RECENT REQUESTS */}
        <h3 style={{ marginTop: "40px", marginBottom: "20px" }}>
          Recent Requests
        </h3>
        {loadingRequests ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "24px", marginBottom: "10px" }}>⏳</div>
            <p>Loading your requests...</p>
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
            <p style={{ fontSize: "18px", color: "#666" }}>No requests yet.</p>
            <p style={{ color: "#999", marginTop: "8px" }}>
              Select a form from the side panel to submit your first request.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Form Type</th>
                  <th>Voucher No</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.slice(0, 10).map((req) => (
                  <tr key={req._id || req.id}>
                    <td>
                      <strong>{req._formTypeLabel}</strong>
                    </td>
                    <td>{req.voucherNo || "-"}</td>
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
                      {req.createdAt
                        ? new Date(req.createdAt).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "-"}
                    </td>
                    <td>
                      {getProofsCount(req) > 0 && (
                        <button
                          onClick={() => viewProofs(req)}
                          className="button"
                          style={{
                            fontSize: "12px",
                            padding: "6px 12px",
                            marginRight: "8px",
                          }}
                        >
                          📎 Proofs ({getProofsCount(req)})
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length > 10 && (
              <p
                style={{
                  textAlign: "center",
                  marginTop: "15px",
                  color: "#666",
                }}
              >
                Showing 10 of {requests.length} requests. View all in "My
                Requests" section.
              </p>
            )}
          </div>
        )}

        {/* MANAGER REVIEWED REQUESTS */}
        {managerApproved.length > 0 && (
          <>
            <h3 style={{ marginTop: "40px", marginBottom: "20px" }}>
              Manager Review
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Form</th>
                    <th>Voucher No</th>
                    <th>Amount</th>
                    <th>Submitted</th>
                    <th>Decision</th>
                    <th>Reason</th>
                    <th>Proofs</th>
                  </tr>
                </thead>
                <tbody>
                  {managerApproved.map((req) => (
                    <tr key={req._id || req.id}>
                      <td>
                        <strong>{req._formTypeLabel}</strong>
                      </td>
                      <td>{req.voucherNo || "-"}</td>
                      <td>
                        <strong>
                          ₹
                          {typeof req.amount === "number"
                            ? req.amount.toLocaleString("en-IN")
                            : req.amount}
                        </strong>
                      </td>
                      <td>
                        {req.createdAt
                          ? new Date(req.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : "-"}
                      </td>
                      <td>
                        <strong
                          style={{
                            color: req.status.includes("approved")
                              ? "#28a745"
                              : "#dc3545",
                          }}
                        >
                          {req.status.includes("approved")
                            ? "✅ Approved"
                            : "❌ Rejected"}
                        </strong>
                      </td>
                      <td>{req.reason || "-"}</td>
                      <td>
                        {getAllProofs(req).length > 0 ? (
                          <button
                            onClick={() => viewProofs(req)}
                            className="button"
                            style={{ fontSize: "12px", padding: "4px 8px" }}
                          >
                            View ({getAllProofs(req).length})
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ADMIN REVIEWED REQUESTS */}
        {adminApproved.length > 0 && (
          <>
            <h3 style={{ marginTop: "40px", marginBottom: "20px" }}>
              Admin Review
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Form</th>
                    <th>Voucher No</th>
                    <th>Amount</th>
                    <th>Submitted</th>
                    <th>Decision</th>
                    <th>Reason</th>
                    <th>Proofs</th>
                  </tr>
                </thead>
                <tbody>
                  {adminApproved.map((req) => (
                    <tr key={req._id || req.id}>
                      <td>
                        <strong>{req._formTypeLabel}</strong>
                      </td>
                      <td>{req.voucherNo || "-"}</td>
                      <td>
                        <strong>
                          ₹
                          {typeof req.amount === "number"
                            ? req.amount.toLocaleString("en-IN")
                            : req.amount}
                        </strong>
                      </td>
                      <td>
                        {req.createdAt
                          ? new Date(req.createdAt).toLocaleDateString(
                              "en-IN",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : "-"}
                      </td>
                      <td>
                        <strong
                          style={{
                            color: req.status.includes("approved")
                              ? "#28a745"
                              : "#dc3545",
                          }}
                        >
                          {req.status.includes("approved")
                            ? "✅ Approved"
                            : "❌ Rejected"}
                        </strong>
                      </td>
                      <td>{req.reason || "-"}</td>
                      <td>
                        {getAllProofs(req).length > 0 ? (
                          <button
                            onClick={() => viewProofs(req)}
                            className="button"
                            style={{ fontSize: "12px", padding: "4px 8px" }}
                          >
                            View ({getAllProofs(req).length})
                          </button>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderMyRequests = () => (
    <div className="section">
      <h2>My Requests</h2>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        All your submitted requests
      </p>

      {loadingRequests ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "24px", marginBottom: "10px" }}>⏳</div>
          <p>Loading your requests...</p>
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
            No requests submitted.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Form Type</th>
                <th>Voucher No</th>
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
                    <strong>{req._formTypeLabel}</strong>
                  </td>
                  <td>{req.voucherNo || "-"}</td>
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
                    {req.createdAt
                      ? new Date(req.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </td>
                  <td>
                    {getProofsCount(req) > 0 && (
                      <button
                        onClick={() => viewProofs(req)}
                        className="button"
                        style={{ fontSize: "12px", padding: "6px 12px" }}
                      >
                        📎 View Proofs ({getProofsCount(req)})
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

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

  return (
    <div className="dashboard-container">
      <SidePanel
        selectedForm={selectedForm}
        setSelectedForm={setSelectedForm}
        userRole="employee"
        onLogout={handleLogout}
      />
      <div className="dashboard-content">{renderForm()}</div>

      {/* PROOFS MODAL */}
      {showProofsModal && selectedRequest && (
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
              padding: 20,
              borderRadius: 8,
              maxWidth: 800,
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <h3>Proofs - {selectedRequest._formTypeLabel}</h3>
            <p>
              <strong>Amount:</strong> ₹{selectedRequest.amount}
            </p>
            <p>
              <strong>Status:</strong> {formatStatus(selectedRequest.status)}
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 20,
              }}
            >
              {getAllProofs(selectedRequest).map((proof, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #ccc",
                    padding: 8,
                    borderRadius: 4,
                  }}
                >
                  <img
                    src={toProofUrl(proof)}
                    alt=""
                    style={{
                      maxWidth: 200,
                      maxHeight: 200,
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "block";
                    }}
                  />
                  <div
                    style={{ display: "none", textAlign: "center", padding: 8 }}
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
            <button
              onClick={() => {
                setShowProofsModal(false);
                setSelectedRequest(null);
              }}
              style={{
                marginTop: 16,
                padding: "8px 16px",
                background: "#6c757d",
                color: "white",
                border: "none",
                borderRadius: 4,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeHome;
