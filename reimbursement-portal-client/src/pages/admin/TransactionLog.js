import React, { useState, useEffect } from "react";
import API from "../../utils/api";
import "../../shared/dashboard.css";
import "./AdminDashboard.css";

const TransactionLog = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [transactionDate, setTransactionDate] = useState("");

  // API handles attaching token from localStorage

  // Fetch completed transactions
  const fetchTransactions = async () => {
    try {
      const res = await API.get("/admin/transactions");
      const data = res.data;
      if (data?.success && Array.isArray(data.data)) setTransactions(data.data);
      else if (Array.isArray(data)) setTransactions(data);
      else if (data?.data && Array.isArray(data.data))
        setTransactions(data.data);
      else setTransactions(data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    try {
      await API.patch(
        `/admin/transactions/${
          selectedTransaction._id || selectedTransaction.id
        }`,
        { transactionDate }
      );
      fetchTransactions();
      setShowModal(false);
      setSelectedTransaction(null);
      setTransactionDate("");
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to update transaction date"
      );
    }
  };

  const openTransactionModal = (transaction) => {
    setSelectedTransaction(transaction);
    setTransactionDate(transaction.transactionDate || "");
    setShowModal(true);
  };

  return (
    <div className="section">
      <h2>Transaction Log</h2>

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
          Loading transactions...
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
              <th>Transaction Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((trans) => (
              <tr key={trans._id || trans.id}>
                <td>{trans.employeeName || trans.user?.name}</td>
                <td>{trans._formTypeLabel || trans.formType}</td>
                <td>₹{trans.amount.toLocaleString("en-IN")}</td>
                <td>
                  <span
                    className={`status-badge ${
                      trans.transactionDate
                        ? "status-approved"
                        : "status-pending"
                    }`}
                  >
                    {trans.transactionDate ? "COMPLETED" : "PENDING"}
                  </span>
                </td>
                <td>{formatDate(trans.approvedAt || trans.updatedAt)}</td>
                <td>
                  {trans.transactionDate
                    ? formatDate(trans.transactionDate)
                    : "-"}
                </td>
                <td>
                  <button
                    className="button"
                    onClick={() => openTransactionModal(trans)}
                    style={{ backgroundColor: "#3498db", color: "white" }}
                  >
                    {trans.transactionDate ? "Update" : "Add"} Date
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Transaction Date Modal */}
      {showModal && selectedTransaction && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>
              {selectedTransaction.transactionDate ? "Update" : "Add"}{" "}
              Transaction Date
            </h2>
            <form onSubmit={handleUpdateTransaction}>
              <div className="form-group">
                <label>Employee Name:</label>
                <div>
                  {selectedTransaction.employeeName ||
                    selectedTransaction.user?.name}
                </div>
              </div>
              <div className="form-group">
                <label>Form Type:</label>
                <div>
                  {selectedTransaction._formTypeLabel ||
                    selectedTransaction.formType}
                </div>
              </div>
              <div className="form-group">
                <label>Amount:</label>
                <div>₹{selectedTransaction.amount.toLocaleString("en-IN")}</div>
              </div>
              <div className="form-group">
                <label>Transaction Date:</label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="button"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button"
                  style={{ backgroundColor: "#27ae60", color: "white" }}
                >
                  Save Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionLog;
