// src/pages/Manager/ManagerVoucherApproval.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../shared/dashboard.css";
import "./ManagerDashboard.css";
import "./ManagerVoucherApproval.css";

function ManagerVoucherApproval() {
  const [vouchers, setVouchers] = useState([]);
  const [teamList, setTeamList] = useState([]);
  const token = localStorage.getItem("token"); // ✅ define token once

  // 🔹 Fetch vouchers that need manager approval
  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const res = await axios.get("/api/vouchers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const filtered = res.data.data.filter(
          (v) => v.status === "pending" || v.status === "managerApproved"
        );
        setVouchers(filtered);
      } catch (err) {
        console.error("Error fetching vouchers:", err);
      }
    };

    fetchVouchers();
  }, [token]);

  // 🔹 Fetch team members
  const fetchTeamMembers = async (currentUserId) => {
    try {
      const res = await axios.get("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const managerId = String(currentUserId);
      const team = res.data.filter(
        (user) =>
          String(user.managerId) === managerId && String(user.id) !== managerId
      );
      setTeamList(team);
    } catch (err) {
      console.error("Error fetching team members:", err);
    }
  };

  // 🔹 Approve / Reject
  const handleAction = async (id, status) => {
    try {
      await axios.put(
        `/api/vouchers/${id}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setVouchers((prev) => prev.filter((v) => v.id !== id));
      alert(`Voucher ${status}`);
    } catch (err) {
      console.error(`Failed to ${status} voucher:`, err);
    }
  };

  return (
    <div className="manager-dashboard">
      <h2>Manager Voucher Approval</h2>

      <h3>Team Members</h3>
      <table className="styled-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {teamList.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Pending Vouchers</h3>
      <table className="styled-table">
        <thead>
          <tr>
            <th>Voucher No</th>
            <th>Prepared By</th>
            <th>Total</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {vouchers.map((v) => (
            <tr key={v.id}>
              <td>{v.voucherNo}</td>
              <td>{v.preparedBy}</td>
              <td>{v.totalExpenses}</td>
              <td>{v.status}</td>
              <td>
                <button onClick={() => handleAction(v.id, "approved")}>
                  Approve
                </button>
                <button onClick={() => handleAction(v.id, "rejected")}>
                  Reject
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ManagerVoucherApproval;
