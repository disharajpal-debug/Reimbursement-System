import React from "react";

/*
  Props:
    reimbursements: array
    onStatusChange(id, status)  // function called when manager/admin approves/rejects
    showActions: boolean (show approve/reject column)
*/
export default function ReimbursementTable({
  reimbursements = [],
  onStatusChange,
  showActions,
}) {
  const role = localStorage.getItem("role");

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Description</th>
            <th>OCR</th>
            <th>Status</th>
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {reimbursements.length === 0 && (
            <tr>
              <td colSpan={showActions ? 8 : 7} style={{ textAlign: "center" }}>
                No requests found.
              </td>
            </tr>
          )}
          {reimbursements.map((r) => (
            <tr key={r.id}>
              <td>{r.id}</td>
              <td>{r.username || r.User?.username || "—"}</td>
              <td>{r.formType || r.type || "—"}</td>
              <td>{r.amount}</td>
              <td style={{ maxWidth: 300, whiteSpace: "pre-wrap" }}>
                {r.description}
              </td>
              <td style={{ maxWidth: 300, whiteSpace: "pre-wrap" }}>
                {r.ocrText || "—"}
              </td>
              <td style={{ textTransform: "capitalize" }}>{r.status}</td>
              {showActions && (
                <td>
                  {["manager", "admin"].includes(role) &&
                  r.status === "pending" ? (
                    <>
                      <button onClick={() => onStatusChange(r.id, "approved")}>
                        Approve
                      </button>
                      <button onClick={() => onStatusChange(r.id, "rejected")}>
                        Reject
                      </button>
                    </>
                  ) : (
                    <span>-</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
