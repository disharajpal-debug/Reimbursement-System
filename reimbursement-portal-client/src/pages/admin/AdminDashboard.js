import React, { useState, useEffect } from "react";
import axios from "axios";
import CashPaymentForm from "../../shared/forms/CashPaymentForm";
import LocalTravelForm from "../../shared/forms/LocalTravelForm";
import OutstationTravelForm from "../../shared/forms/OutstationTravelForm";
import VendorPaymentForm from "../../shared/forms/VendorPaymentForm";
import SidePanel from "../../shared/components/SidePanel";
import UserManagement from "./users/UserManagement";
import VoucherApproval from "./Vouchers/VoucherApproval";
import "../../shared/dashboard.css";

const AdminDashboard = () => {
  const [admin, setAdmin] = useState(null);
  const [selectedForm, setSelectedForm] = useState('dashboard');
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [cashPayments, setCashPayments] = useState([]);
  const [loadingCashPayments, setLoadingCashPayments] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showProofsModal, setShowProofsModal] = useState(false);

  const token = localStorage.getItem("token");

  // Fetch admin info from localStorage or backend
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setAdmin(JSON.parse(storedUser));
        } else if (token) {
          const res = await axios.get("http://localhost:5000/api/users/me", {
            headers: { Authorization: `Bearer ${token}` },
          });
          setAdmin(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        }
      } catch (err) {
        console.error("Error fetching admin info:", err);
      }
    };
    fetchAdmin();
  }, [token]);

  // Fetch all requests (admin can see all)
  useEffect(() => {
    const fetchAllRequests = async () => {
      setLoadingRequests(true);
      try {
        if (!token) return;
        
        // Fetch all types of requests
        const [reimbursements, cashPayments, localTravel, outstationTravel, vendorPayments, vouchers] = await Promise.all([
          axios.get("http://localhost:5000/api/reimbursements", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/cash-payment", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/local-travel", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/outstation-travel", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/vendor-payments", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/vouchers", { headers: { Authorization: `Bearer ${token}` } })
        ]);

        // Combine all requests into a unified format
        const allRequests = [
          ...(reimbursements.data || []).map(req => ({ ...req, formType: 'reimbursement', type: req.type })),
          ...(cashPayments.data || []).map(req => ({ ...req, formType: 'cash_payment', type: 'Cash Payment', amount: req.totalExpenses, employeeName: req.employeeName })),
          ...(localTravel.data?.data || []).map(req => ({ ...req, formType: 'local_travel', type: 'Local Travel', amount: req.totalExpenses, employeeName: req.user?.name })),
          ...(outstationTravel.data?.data || []).map(req => ({ ...req, formType: 'outstation_travel', type: 'Outstation Travel', amount: req.totalExpenses, employeeName: req.user?.name })),
          ...(vendorPayments.data?.data || []).map(req => ({ ...req, formType: 'vendor_payment', type: 'Vendor Payment', amount: req.totalExpenses, employeeName: req.user?.name })),
          ...(vouchers.data?.data || []).map(req => ({ ...req, formType: req.formType, type: req.formType.replace('_', ' ').toUpperCase(), amount: req.totalAmount, employeeName: req.employeeName }))
        ];

        setRequests(allRequests);
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoadingRequests(false);
      }
    };
    fetchAllRequests();
  }, [token]);

  // Fetch all cash payments (admin can see all)
  useEffect(() => {
    const fetchCashPayments = async () => {
      setLoadingCashPayments(true);
      try {
        if (!token) return;
        const res = await axios.get(
          "http://localhost:5000/api/cash-payment",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCashPayments(res.data);
      } catch (err) {
        console.error("Error fetching cash payments:", err);
      } finally {
        setLoadingCashPayments(false);
      }
    };
    fetchCashPayments();
  }, [token]);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        if (!token) return;
        const res = await axios.get(
          "http://localhost:5000/api/users",
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAllUsers(res.data);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [token]);

  // Render the selected form and pass admin info as prop
  const renderForm = () => {
    const props = { loggedInUser: admin };
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
        return renderAllRequests();
      case "user-management":
        return <UserManagement />;
      case "voucher-approval":
        return <VoucherApproval />;
      case "dashboard":
      default:
        return renderDashboard();
    }
  };

  const renderDashboard = () => (
    <div className="section">
      <h2>Welcome, {admin?.name || "Admin"}!</h2>
      <p>Admin Dashboard - Manage all reimbursement requests and system operations.</p>
      
      {/* Stats Cards */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "30px" }}>
        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "white",
            flex: 1,
            textAlign: "center"
          }}
        >
          <h3>Total Requests</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold", color: "#2c3e50" }}>{requests.length}</p>
        </div>
        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "white",
            flex: 1,
            textAlign: "center"
          }}
        >
          <h3>Cash Payments</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold", color: "#2c3e50" }}>{cashPayments.length}</p>
        </div>
        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "white",
            flex: 1,
            textAlign: "center"
          }}
        >
          <h3>Pending</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold", color: "#2c3e50" }}>
            {requests.filter(r => r.status === "pending").length}
          </p>
        </div>
        <div
        style={{
          padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "white",
            flex: 1,
            textAlign: "center"
          }}
        >
          <h3>Total Users</h3>
          <p style={{ fontSize: "24px", fontWeight: "bold", color: "#2c3e50" }}>{allUsers.length}</p>
        </div>
      </div>

      <h3 style={{ marginTop: "40px" }}>Recent Requests</h3>
      {loadingRequests ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
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
            {requests.slice(0, 10).map((req) => (
              <tr key={req.id}>
                <td>{req.employeeName || req.user?.name || "-"}</td>
                <td>{req.type || req.formType?.replace('_', ' ').toUpperCase() || "-"}</td>
                <td>₹{req.amount || req.totalAmount || req.totalExpenses || "-"}</td>
                <td>
                  <span className={`status-badge ${
                    req.status === 'approved' ? 'status-approved' : 
                    req.status === 'rejected' ? 'status-rejected' : 'status-pending'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td>{new Date(req.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderAllRequests = () => (
    <div className="section">
      <h2>All Requests</h2>
      {loadingRequests ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
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
            {requests.map((req) => (
              <tr key={req.id}>
                <td>{req.employeeName || req.user?.name || "-"}</td>
                <td>{req.type || req.formType?.replace('_', ' ').toUpperCase() || "-"}</td>
                <td>₹{req.amount || req.totalAmount || req.totalExpenses || "-"}</td>
                <td>
                  <span className={`status-badge ${
                    req.status === 'approved' ? 'status-approved' : 
                    req.status === 'rejected' ? 'status-rejected' : 'status-pending'
                  }`}>
                    {req.status}
                  </span>
                </td>
                <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                <td>
                  {getProofsCount(req) > 0 && (
                    <button
                      onClick={() => viewProofs(req)}
                      className="button"
                      style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#17a2b8', color: 'white' }}
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

  // Helper function to get proofs count from request
  const getProofsCount = (req) => {
    if (req.proofs && Array.isArray(req.proofs)) {
      return req.proofs.length;
    }
    if (req.bills && Array.isArray(req.bills)) {
      return req.bills.filter(bill => bill.proof).length;
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
      req.bills.forEach(bill => {
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
    if (!proof) return '';
    const s = String(proof);
    if (/^https?:\/\//i.test(s)) return s;
    const clean = s.replace(/^\/+/, '').replace(/^uploadFiles\//i, '').replace(/\\/g, '/');
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
      <div className="dashboard-content">
        {renderForm()}
      </div>

      {/* Proofs Modal */}
      {showProofsModal && selectedRequest && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "800px",
            maxHeight: "90vh",
            overflow: "auto",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
          }}>
            <h3>Proofs - {selectedRequest.type || selectedRequest.formType?.replace('_', ' ').toUpperCase()}</h3>
            <p><strong>Employee:</strong> {selectedRequest.employeeName || selectedRequest.user?.name || "-"}</p>
            <p><strong>Amount:</strong> ₹{selectedRequest.amount || selectedRequest.totalAmount || selectedRequest.totalExpenses || "-"}</p>
            <p><strong>Status:</strong> {selectedRequest.status}</p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
              {getAllProofs(selectedRequest).map((proof, index) => (
                <div key={index} style={{ border: '1px solid #ccc', padding: '8px', borderRadius: '4px' }}>
                  <img
                    src={toProofUrl(proof)}
                    alt={`Proof ${index + 1}`}
                    style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div style={{ display: 'none', padding: '10px', textAlign: 'center' }}>
                    <a href={toProofUrl(proof)} target="_blank" rel="noopener noreferrer">
                      View Document
                    </a>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                onClick={() => { setShowProofsModal(false); setSelectedRequest(null); }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
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
