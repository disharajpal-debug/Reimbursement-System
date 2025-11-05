// src/components/ReimbursementList.js
import API from "../utils/api";

function ReimbursementList({ reimbursements, refresh }) {
  const role = localStorage.getItem("role");

  const handleStatusChange = async (id, status) => {
    try {
      await API.put(`/reimbursements/${id}/status`, { status });
      refresh();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  return (
    <div>
      <h3>Reimbursements</h3>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
            <th>Description</th>
            <th>OCR Text</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reimbursements.map((r) => (
            <tr key={r.id}>
              <td>{r.type}</td>
              <td>{r.amount}</td>
              <td>{r.description}</td>
              <td>{r.ocrText || "No OCR Data"}</td>
              <td>{r.status}</td>
              <td>
                {(role === "manager" || role === "admin") &&
                  r.status === "Pending" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(r.id, "Approved")}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange(r.id, "Rejected")}
                      >
                        Reject
                      </button>
                    </>
                  )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ReimbursementList;
