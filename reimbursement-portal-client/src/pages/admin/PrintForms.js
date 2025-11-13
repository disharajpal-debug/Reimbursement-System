import React, { useState, useEffect } from "react";
import API from "../../utils/api";
import "../../shared/dashboard.css";
import "./AdminDashboard.css";

const PrintForms = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);

  // API attaches token automatically; no need to read it here

  // Fetch approved requests
  const fetchApprovedRequests = async () => {
    try {
      const res = await API.get("/admin/approved-requests");
      const data = res.data;
      if (data?.success && Array.isArray(data.data)) setRequests(data.data);
      else if (Array.isArray(data)) setRequests(data);
      else if (data?.data && Array.isArray(data.data)) setRequests(data.data);
      else setRequests(data || []);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to fetch approved requests"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovedRequests();
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handlePrint = () => {
    window.print();
    setPrintModalOpen(false);
  };

  const openPrintModal = (request) => {
    setSelectedRequest(request);
    setPrintModalOpen(true);
  };

  return (
    <div className="section">
      <h2>Print Approved Forms</h2>

      {error && (
        <div
          style={{
            background: "#fee8e6",
            color: "#e74c3c",
            padding: 12,
            borderRadius: 6,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          Loading approved requests...
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Form Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Approved On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req._id || req.id}>
                <td>{req.employeeName || req.user?.name}</td>
                <td>{req._formTypeLabel || req.formType}</td>
                <td>₹{req.amount.toLocaleString("en-IN")}</td>
                <td>
                  <span className="status-badge status-approved">
                    {req.status.toUpperCase()}
                  </span>
                </td>
                <td>{formatDate(req.approvedAt || req.updatedAt)}</td>
                <td>
                  <button
                    className="button"
                    onClick={() => openPrintModal(req)}
                    style={{ backgroundColor: "#3498db", color: "white" }}
                  >
                    Print Form
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Print Modal */}
      {printModalOpen && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-content print-form">
            <div className="print-header">
              <h2>Company Name</h2>
              <h3>
                {selectedRequest._formTypeLabel || selectedRequest.formType}{" "}
                Form
              </h3>
            </div>

            <div className="print-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Employee Name:</label>
                  <div>
                    {selectedRequest.employeeName || selectedRequest.user?.name}
                  </div>
                </div>
                <div className="form-group">
                  <label>Form Type:</label>
                  <div>
                    {selectedRequest._formTypeLabel || selectedRequest.formType}
                  </div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount:</label>
                  <div>₹{selectedRequest.amount.toLocaleString("en-IN")}</div>
                </div>
                <div className="form-group">
                  <label>Status:</label>
                  <div>{selectedRequest.status.toUpperCase()}</div>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Submitted On:</label>
                  <div>{formatDate(selectedRequest.createdAt)}</div>
                </div>
                <div className="form-group">
                  <label>Approved On:</label>
                  <div>
                    {formatDate(
                      selectedRequest.approvedAt || selectedRequest.updatedAt
                    )}
                  </div>
                </div>
              </div>

              {selectedRequest.description && (
                <div className="form-group">
                  <label>Description:</label>
                  <div>{selectedRequest.description}</div>
                </div>
              )}

              {selectedRequest.reason && (
                <div className="form-group">
                  <label>Approval Reason:</label>
                  <div>{selectedRequest.reason}</div>
                </div>
              )}

              <div className="signatures">
                <div className="signature-box">
                  <div className="sign-line"></div>
                  <div>Employee Signature</div>
                </div>
                <div className="signature-box">
                  <div className="sign-line"></div>
                  <div>Manager Signature</div>
                </div>
                <div className="signature-box">
                  <div className="sign-line"></div>
                  <div>Admin Signature</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="button"
                onClick={() => setPrintModalOpen(false)}
              >
                Close
              </button>
              <button
                className="button"
                onClick={handlePrint}
                style={{ backgroundColor: "#3498db", color: "white" }}
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintForms;
