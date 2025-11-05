// src/pages/admin/vouchers/VoucherApproval.js
import React, { useEffect, useState } from "react";
import API from "../../../utils/api";
import { isAuthenticated } from "../../../utils/auth";

function VoucherApproval({ teamMembers = null, currentUser = null }) {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showProofsModal, setShowProofsModal] = useState(false);
  const [transactionDate, setTransactionDate] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [filters, setFilters] = useState({
    status: "",
    formType: ""
  });

  // Check if this is being used by a manager (has teamMembers prop)
  const isManager = teamMembers && currentUser;

  // ✅ Fetch vouchers from backend
  useEffect(() => {
    fetchVouchers();
  }, [filters]);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      if (!isAuthenticated()) {
        alert("Please log in to access this page.");
        window.location.href = "/login";
        return;
      }
      
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.formType) params.append('formType', filters.formType);
      params.append('_', Date.now()); // Cache-busting timestamp
      
      const res = await API.get(`/vouchers?${params.toString()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      let allVouchers = res.data.data || res.data;
      
      // If this is a manager, filter to only show team members' vouchers
      if (isManager && teamMembers && teamMembers.length > 0) {
        const teamIds = teamMembers.map(member => member.id);
        const teamNames = teamMembers.map(member => member.name);
        
        allVouchers = allVouchers.filter(voucher => {
          // Check by employee ID or employee name
          const isTeamMember = teamIds.includes(voucher.employeeId) || 
                              teamNames.includes(voucher.employeeName);
          return isTeamMember;
        });
        
        console.log('Manager filtering vouchers:', {
          totalVouchers: res.data.data?.length || res.data.length,
          teamIds,
          teamNames,
          filteredVouchers: allVouchers.length
        });
      }
      
      setVouchers(allVouchers);
    } catch (err) {
      console.error("Error fetching vouchers:", err);
      if (err.response?.status === 401) {
        alert("Session expired. Please log in again.");
        window.location.href = "/login";
      } else if (err.response?.status === 403) {
        alert("Access denied. You don't have permission to view vouchers. Please contact your administrator.");
      } else {
        alert("Error fetching vouchers. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle Approve/Reject
  const handleApproveReject = async (voucherId, action) => {
    try {
      const payload = {
        status: action,
        remarks: remarks
      };
      
      if (action === 'rejected' && rejectionReason) {
        payload.rejectionReason = rejectionReason;
      }
      
      const res = await API.patch(`/vouchers/${voucherId}/status`, payload);
      
      if (res.data.success) {
        setShowDetailsModal(false);
        setRemarks("");
        setRejectionReason("");
        
        if (action === 'approved') {
          setSelectedVoucher(res.data.data);
          setShowPrintModal(true);
        }
        fetchVouchers(); // Refetch to ensure current data
      }
    } catch (err) {
      console.error("Error updating voucher:", err);
      if (err.response?.status === 401) {
        alert("Session expired. Please log in again.");
        window.location.href = "/login";
      } else {
        alert("Error updating voucher. Please try again.");
      }
    }
  };

  // ✅ Handle Mark as Completed
  const handleMarkCompleted = async (voucherId) => {
    try {
      const payload = {
        transactionDate: transactionDate || new Date().toISOString().split('T')[0],
        remarks: remarks
      };
      
      const res = await API.patch(`/vouchers/${voucherId}/complete`, payload);
      
      if (res.data.success) {
        setShowTransactionModal(false);
        setTransactionDate("");
        setRemarks("");
        alert("Voucher marked as completed successfully!");
        fetchVouchers(); // Refetch to ensure current data
      }
    } catch (err) {
      console.error("Error marking voucher as completed:", err);
      if (err.response?.status === 401) {
        alert("Session expired. Please log in again.");
        window.location.href = "/login";
      } else {
        alert("Error marking voucher as completed. Please try again.");
      }
    }
  };

  // ✅ View Voucher Details
  const viewVoucherDetails = (voucher) => {
    setSelectedVoucher(voucher);
    setShowDetailsModal(true);
  };

  // ✅ Print Voucher with form-specific layout
  const handlePrint = (voucher) => {
    const printWindow = window.open("", "_blank");
    const formData = voucher.formData || {};

    const renderBillsTable = (bills = []) => {
      if (!Array.isArray(bills) || bills.length === 0) return '';
      return `
        <div class="section">
          <h3>Bill Details</h3>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${bills.map(b => `
                <tr>
                  <td>${b.description || ''}</td>
                  <td>₹${b.amount || 0}</td>
                  <td>${b.date || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    };

    const renderFormSection = () => {
      const type = voucher.formType;
      if (type === 'cash_payment') {
        return `
          <div class="section">
            <div class="row"><div class="label">Payment Date:</div><div class="value">${formData.paymentDate || ''}</div></div>
            <div class="row"><div class="label">Advance Payment:</div><div class="value">₹${formData.advancePayment || 0}</div></div>
            <div class="row"><div class="label">Balance Reimbursement:</div><div class="value">₹${formData.balanceReimbursement || 0}</div></div>
          </div>
          ${renderBillsTable(formData.bills)}
        `;
      }
      if (type === 'local_travel') {
        return `
          <div class="section">
            <div class="row"><div class="label">Payment Mode:</div><div class="value">${formData.paymentMode || ''}</div></div>
            <div class="row"><div class="label">Date:</div><div class="value">${formData.date || ''}</div></div>
          </div>
          ${renderBillsTable(formData.bills)}
        `;
      }
      if (type === 'outstation_travel') {
        return `
          <div class="section">
            <div class="row"><div class="label">From:</div><div class="value">${formData.dateFrom || ''}</div></div>
            <div class="row"><div class="label">To:</div><div class="value">${formData.dateTo || ''}</div></div>
            <div class="row"><div class="label">Description:</div><div class="value">${formData.travelDescription || ''}</div></div>
          </div>
          ${renderBillsTable(formData.bills)}
        `;
      }
      if (type === 'vendor_payment') {
        return `
          <div class="section">
            <div class="row"><div class="label">Vendor Name:</div><div class="value">${formData.vendorName || ''}</div></div>
            <div class="row"><div class="label">Date:</div><div class="value">${formData.date || ''}</div></div>
          </div>
          ${renderBillsTable(formData.bills)}
        `;
      }
      if (type === 'reimbursement') {
        return `
          <div class="section">
            <div class="row"><div class="label">Type:</div><div class="value">${formData.type || ''}</div></div>
            <div class="row"><div class="label">Amount:</div><div class="value">₹${formData.amount || voucher.totalAmount}</div></div>
            <div class="row"><div class="label">Description:</div><div class="value">${formData.description || ''}</div></div>
          </div>
        `;
      }
      return '';
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>Voucher Print - ${voucher.voucherNo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            @page { size: A4; margin: 10mm; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .row { display: flex; margin-bottom: 10px; }
            .label { font-weight: bold; width: 200px; }
            .value { flex: 1; }
            .signatures { margin-top: 50px; display: flex; justify-content: space-between; }
            .signature-box { text-align: center; width: 150px; }
            .signature-line { border-bottom: 1px solid #000; height: 20px; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f0f0f0; }
            .proofs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
            .proofs img { width: 160px; height: 110px; object-fit: contain; border: 1px solid #aaa; padding: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PAYMENT VOUCHER</h1>
            <h2>Voucher No: ${voucher.voucherNo}</h2>
          </div>

          <div class="section">
            <h3>Employee Details</h3>
            <div class="row"><div class="label">Employee Name:</div><div class="value">${voucher.employeeName}</div></div>
            <div class="row"><div class="label">Role:</div><div class="value">${voucher.employee?.role || 'N/A'}</div></div>
            <div class="row"><div class="label">Form Type:</div><div class="value">${voucher.formType.replace('_', ' ').toUpperCase()}</div></div>
          </div>

          <div class="section">
            <h3>Financial Details</h3>
            <div class="row"><div class="label">Total Amount:</div><div class="value">₹${voucher.totalAmount}</div></div>
            <div class="row"><div class="label">Project Name:</div><div class="value">${voucher.projectName || 'N/A'}</div></div>
            <div class="row"><div class="label">EC Location:</div><div class="value">${voucher.ecLocation}</div></div>
          </div>

          ${renderFormSection()}

          <div class="section">
            <h3>Status Information</h3>
            <div class="row"><div class="label">Status:</div><div class="value">${voucher.status.toUpperCase()}</div></div>
            <div class="row"><div class="label">Approved By:</div><div class="value">${voucher.approver?.name || 'N/A'}</div></div>
            <div class="row"><div class="label">Approved Date:</div><div class="value">${voucher.approvedAt ? new Date(voucher.approvedAt).toLocaleDateString() : 'N/A'}</div></div>
            ${voucher.transactionDate ? `<div class="row"><div class="label">Transaction Date:</div><div class="value">${new Date(voucher.transactionDate).toLocaleDateString()}</div></div>` : ''}
          </div>

          ${(voucher.proofs && voucher.proofs.length) ? `
          <div class="section">
            <h3>Attached Proofs</h3>
            <div class="proofs">
              ${voucher.proofs.map(p => {
                const s = String(p);
                const url = /^https?:\/\//i.test(s) ? s : `http://localhost:5000/uploadFiles/${s.replace(/^\/+/, '').replace(/^uploadFiles\//i, '')}`;
                return `<img src="${url}" alt="proof" />`;
              }).join('')}
            </div>
          </div>
          ` : ''}

          ${voucher.remarks ? `<div class="section"><h3>Remarks</h3><p>${voucher.remarks}</p></div>` : ''}

          <div class="signatures">
            <div class="signature-box"><div class="signature-line"></div><div>Prepared By</div></div>
            <div class="signature-box"><div class="signature-line"></div><div>Accounts</div></div>
            <div class="signature-box"><div class="signature-line"></div><div>Authorized Signatory</div></div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Normalize proof URLs (handles absolute URLs and strips duplicate uploadFiles prefix)
  const toProofUrl = (p) => {
    if (!p) return '';
    const s = String(p);
    if (/^https?:\/\//i.test(s)) return s;
    const clean = s.replace(/^\/+/, '').replace(/^uploadFiles\//i, '').replace(/\\/g, '/');
    return `http://localhost:5000/uploadFiles/${clean}`;
  };

  // ✅ Styles
  const containerStyle = {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  };
  const headingStyle = {
    textAlign: "center",
    marginBottom: "20px",
  };
  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
  };
  const thtdStyle = {
    border: "1px solid black",
    padding: "8px",
    textAlign: "left",
  };
  const buttonStyle = {
    padding: "6px 12px",
    margin: "0 4px",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  };
  const approveBtn = { ...buttonStyle, backgroundColor: "#4CAF50", color: "white" };
  const rejectBtn = { ...buttonStyle, backgroundColor: "#f44336", color: "white" };
  const printBtn = { ...buttonStyle, backgroundColor: "#2196F3", color: "white" };
  const completeBtn = { ...buttonStyle, backgroundColor: "#ff9800", color: "white" };
  
  const modalOverlay = {
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
  };
  
  const modalContent = {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    maxWidth: "800px",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
  };

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>
        {isManager ? 'Team Voucher Approval' : 'Voucher Approval'}
      </h2>
      {isManager && (
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '20px' }}>
          Showing vouchers for your team members only
        </p>
      )}
      
      {/* Filters */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "10px", alignItems: "center" }}>
        <select
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
        
        <select
          value={filters.formType}
          onChange={(e) => setFilters({...filters, formType: e.target.value})}
          style={{ padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
        >
          <option value="">All Form Types</option>
          <option value="cash_payment">Cash Payment</option>
          <option value="local_travel">Local Travel</option>
          <option value="outstation_travel">Outstation Travel</option>
          <option value="vendor_payment">Vendor Payment</option>
          <option value="reimbursement">Reimbursement</option>
        </select>
        
        <button
          onClick={fetchVouchers}
          style={{ padding: "8px 16px", backgroundColor: "#2196F3", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <p>Loading vouchers...</p>
        </div>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thtdStyle}>Voucher No</th>
              <th style={thtdStyle}>Employee</th>
              <th style={thtdStyle}>Form Type</th>
              <th style={thtdStyle}>Amount</th>
              <th style={thtdStyle}>Status</th>
              <th style={thtdStyle}>Created Date</th>
              <th style={thtdStyle}>Transaction Date</th>
              <th style={thtdStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => (
              <tr key={v.id}>
                <td style={thtdStyle}>{v.voucherNo}</td>
                <td style={thtdStyle}>{v.employeeName}</td>
                <td style={thtdStyle}>{v.formType.replace('_', ' ').toUpperCase()}</td>
                <td style={thtdStyle}>₹{v.totalAmount}</td>
                <td style={thtdStyle}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    backgroundColor: 
                      v.status === 'pending' ? '#fff3cd' :
                      v.status === 'approved' ? '#d4edda' :
                      v.status === 'rejected' ? '#f8d7da' :
                      '#d1ecf1',
                    color: 
                      v.status === 'pending' ? '#856404' :
                      v.status === 'approved' ? '#155724' :
                      v.status === 'rejected' ? '#721c24' :
                      '#0c5460'
                  }}>
                    {v.status.toUpperCase()}
                  </span>
                </td>
                <td style={thtdStyle}>
                  {new Date(v.createdAt).toLocaleDateString()}
                </td>
                <td style={thtdStyle}>
                  {v.status === 'approved' || v.status === 'completed' ? (
                    <span
                      style={{ textDecoration: 'underline', color: '#007bff', cursor: 'pointer' }}
                      title="Edit transaction date"
                      onClick={() => { setSelectedVoucher(v); setShowTransactionModal(true); }}
                    >
                      {v.transactionDate ? new Date(v.transactionDate).toLocaleDateString() : 'Set date'}
                    </span>
                  ) : (
                    v.transactionDate ? new Date(v.transactionDate).toLocaleDateString() : '-'
                  )}
                </td>
                <td style={thtdStyle}>
                  <button
                    style={{...buttonStyle, backgroundColor: "#17a2b8", color: "white", marginRight: "5px"}}
                    onClick={() => viewVoucherDetails(v)}
                  >
                    View Details
                  </button>

                  {Array.isArray(v.proofs) && v.proofs.length > 0 && (
                    <button
                      style={{...buttonStyle, backgroundColor: "#6f42c1", color: "white", marginRight: "5px"}}
                      onClick={() => { setSelectedVoucher(v); setShowProofsModal(true); }}
                      title="View proofs"
                    >
                      Proofs ({v.proofs.length})
                    </button>
                  )}
                  
                  {v.status === "pending" && (
                    <>
                      <button
                        style={approveBtn}
                        onClick={() => handleApproveReject(v.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        style={rejectBtn}
                        onClick={() => handleApproveReject(v.id, "rejected")}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  
                  {v.status === "approved" && (
                    <>
                      <button style={printBtn} onClick={() => handlePrint(v)}>
                        Print
                      </button>
                      <button
                        style={completeBtn}
                        onClick={() => {
                          setSelectedVoucher(v);
                          setShowTransactionModal(true);
                        }}
                      >
                        Mark Completed
                      </button>
                    </>
                  )}
                  
                  {v.status === "rejected" && (
                    <span style={{ color: "#f44336", fontWeight: "bold" }}>
                      ❌ Rejected
                    </span>
                  )}
                  
                  {v.status === "completed" && (
                    <span style={{ color: "#4CAF50", fontWeight: "bold" }}>
                      ✅ Completed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Voucher Details Modal */}
      {showDetailsModal && selectedVoucher && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>Voucher Details - {selectedVoucher.voucherNo}</h3>
            
            <div style={{ marginBottom: "20px" }}>
              <h4>Employee Information</h4>
              <p><strong>Name:</strong> {selectedVoucher.employeeName}</p>
              <p><strong>Role:</strong> {selectedVoucher.employee?.role || 'N/A'}</p>
              <p><strong>Email:</strong> {selectedVoucher.employee?.email || 'N/A'}</p>
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <h4>Financial Details</h4>
              <p><strong>Form Type:</strong> {selectedVoucher.formType.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Total Amount:</strong> ₹{selectedVoucher.totalAmount}</p>
              <p><strong>Project Name:</strong> {selectedVoucher.projectName || 'N/A'}</p>
              <p><strong>EC Location:</strong> {selectedVoucher.ecLocation}</p>
            </div>
            
            {selectedVoucher.formData && (
              <div style={{ marginBottom: "20px" }}>
                <h4>Form Data</h4>
                <pre style={{ backgroundColor: "#f5f5f5", padding: "10px", borderRadius: "4px", overflow: "auto", maxHeight: "200px" }}>
                  {JSON.stringify(selectedVoucher.formData, null, 2)}
                </pre>
              </div>
            )}
            
            {selectedVoucher.proofs && selectedVoucher.proofs.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h4>Proofs/Documents</h4>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {selectedVoucher.proofs.map((proof, index) => (
                    <div key={index} style={{ border: "1px solid #ccc", padding: "10px", borderRadius: "4px" }}>
                      <img 
                        src={toProofUrl(proof)} 
                        alt={`Proof ${index + 1}`}
                        style={{ maxWidth: "200px", maxHeight: "200px", objectFit: "contain" }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'block';
                        }}
                      />
                      <div style={{ display: "none", padding: "10px", textAlign: "center" }}>
                        <a href={toProofUrl(proof)} target="_blank" rel="noopener noreferrer">
                          View Document
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ marginBottom: "20px" }}>
              <h4>Status Information</h4>
              <p><strong>Status:</strong> {selectedVoucher.status.toUpperCase()}</p>
              {selectedVoucher.approver && (
                <p><strong>Approved By:</strong> {selectedVoucher.approver.name}</p>
              )}
              {selectedVoucher.approvedAt && (
                <p><strong>Approved Date:</strong> {new Date(selectedVoucher.approvedAt).toLocaleString()}</p>
              )}
              {selectedVoucher.rejectionReason && (
                <p><strong>Rejection Reason:</strong> {selectedVoucher.rejectionReason}</p>
              )}
              {selectedVoucher.remarks && (
                <p><strong>Remarks:</strong> {selectedVoucher.remarks}</p>
              )}
            </div>
            
            {selectedVoucher.status === "pending" && (
              <div style={{ marginBottom: "20px" }}>
                <h4>Action</h4>
                <div style={{ marginBottom: "10px" }}>
                  <label>Remarks (Optional):</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                    rows="3"
                    placeholder="Enter any remarks..."
                  />
                </div>
                {selectedVoucher.status === "pending" && (
                  <div style={{ marginBottom: "10px" }}>
                    <label>Rejection Reason (if rejecting):</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                      rows="2"
                      placeholder="Enter rejection reason..."
                    />
                  </div>
                )}
              </div>
            )}
            
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                style={{...buttonStyle, backgroundColor: "#6c757d", color: "white"}}
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedVoucher(null);
                  setRemarks("");
                  setRejectionReason("");
                }}
              >
                Close
              </button>
              
              {selectedVoucher.status === "pending" && (
                <>
                  <button
                    style={approveBtn}
                    onClick={() => handleApproveReject(selectedVoucher.id, "approved")}
                  >
                    Approve
                  </button>
                  <button
                    style={rejectBtn}
                    onClick={() => handleApproveReject(selectedVoucher.id, "rejected")}
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && selectedVoucher && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>Print Voucher</h3>
            <p>Voucher {selectedVoucher.voucherNo} has been approved. Click the button below to print the voucher.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                style={printBtn}
                onClick={() => {
                  handlePrint(selectedVoucher);
                  setShowPrintModal(false);
                  setSelectedVoucher(null);
                }}
              >
                Print Voucher
              </button>
              <button
                style={{...buttonStyle, backgroundColor: "#6c757d", color: "white"}}
                onClick={() => {
                  setShowPrintModal(false);
                  setSelectedVoucher(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Completion Modal */}
      {showTransactionModal && selectedVoucher && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>Mark Transaction as Completed</h3>
            <p>Voucher: {selectedVoucher.voucherNo}</p>
            <p>Amount: ₹{selectedVoucher.totalAmount}</p>
            
            <div style={{ marginBottom: "20px" }}>
              <label>Transaction Date:</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginTop: "5px" }}
              />
            </div>
            
            <div style={{ marginBottom: "20px" }}>
              <label>Remarks (Optional):</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", marginTop: "5px" }}
                rows="3"
                placeholder="Enter any remarks about the transaction completion..."
              />
            </div>
            
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                style={completeBtn}
                onClick={() => handleMarkCompleted(selectedVoucher.id)}
              >
                Mark as Completed
              </button>
              <button
                style={{...buttonStyle, backgroundColor: "#6c757d", color: "white"}}
                onClick={() => {
                  setShowTransactionModal(false);
                  setSelectedVoucher(null);
                  setTransactionDate("");
                  setRemarks("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proofs Modal */}
      {showProofsModal && selectedVoucher && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <h3>Attached Proofs - {selectedVoucher.voucherNo}</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {(selectedVoucher.proofs || []).map((p, idx) => (
                <div key={idx} style={{ border: '1px solid #ccc', padding: '8px', borderRadius: '4px' }}>
                  <img
                    src={toProofUrl(p)}
                    alt={`Proof ${idx + 1}`}
                    style={{ maxWidth: '220px', maxHeight: '160px', objectFit: 'contain' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'block';
                    }}
                  />
                  <div style={{ display: 'none', padding: '10px', textAlign: 'center' }}>
                    <a href={toProofUrl(p)} target="_blank" rel="noopener noreferrer">View Document</a>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                style={{...buttonStyle, backgroundColor: "#6c757d", color: "white"}}
                onClick={() => { setShowProofsModal(false); setSelectedVoucher(null); }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VoucherApproval;