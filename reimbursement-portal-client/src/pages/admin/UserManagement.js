import React, { useState, useEffect } from "react";
import API from "../../utils/api";
import "../../shared/dashboard.css";
import "./AdminDashboard.css";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    managerId: "",
  });
  const [managers, setManagers] = useState([]);

  // API attaches token automatically via interceptor
  // Fetch users
  const fetchUsers = async () => {
    try {
      const res = await API.get("/admin/users");
      const data = res.data;
      let usersArray = [];
      if (data?.success && Array.isArray(data.data)) usersArray = data.data;
      else if (Array.isArray(data)) usersArray = data;
      else if (data?.data && Array.isArray(data.data)) usersArray = data.data;
      else usersArray = data || [];

      setUsers(usersArray);

      // Filter managers for dropdown
      const managersList = usersArray.filter((user) => user.role === "manager");
      setManagers(managersList);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle add user
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await API.post("/admin/users", formData);
      setShowAddModal(false);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "employee",
        managerId: "",
      });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add user");
    }
  };

  // Handle edit user
  const handleEditUser = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/admin/users/${selectedUser.id}`, formData);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update user");
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await API.delete(`/admin/users/${userId}`);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete user");
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      managerId: user.managerId || "",
    });
    setShowEditModal(true);
  };

  return (
    <div className="section">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>User Management</h2>
        <button
          className="button"
          onClick={() => setShowAddModal(true)}
          style={{ backgroundColor: "#27ae60", color: "white" }}
        >
          Add New User
        </button>
      </div>

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
          Loading users...
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Manager</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span
                    className={`status-badge ${
                      user.role === "admin"
                        ? "status-approved"
                        : user.role === "manager"
                        ? "status-pending"
                        : ""
                    }`}
                  >
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td>
                  {user.managerId
                    ? users.find((u) => u.id === user.managerId)?.name
                    : "-"}
                </td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="button"
                      onClick={() => openEditModal(user)}
                      style={{ backgroundColor: "#3498db", color: "white" }}
                    >
                      Edit
                    </button>
                    <button
                      className="button"
                      onClick={() => handleDeleteUser(user.id)}
                      style={{ backgroundColor: "#e74c3c", color: "white" }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Add New User</h2>
            <form onSubmit={handleAddUser}>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Role:</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  required
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {formData.role === "employee" && (
                <div className="form-group">
                  <label>Manager:</label>
                  <select
                    value={formData.managerId}
                    onChange={(e) =>
                      setFormData({ ...formData, managerId: e.target.value })
                    }
                  >
                    <option value="">Select Manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="modal-footer">
                <button
                  type="button"
                  className="button"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button"
                  style={{ backgroundColor: "#27ae60", color: "white" }}
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Edit User</h2>
            <form onSubmit={handleEditUser}>
              <div className="form-group">
                <label>Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Role:</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  required
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {formData.role === "employee" && (
                <div className="form-group">
                  <label>Manager:</label>
                  <select
                    value={formData.managerId}
                    onChange={(e) =>
                      setFormData({ ...formData, managerId: e.target.value })
                    }
                  >
                    <option value="">Select Manager</option>
                    {managers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="modal-footer">
                <button
                  type="button"
                  className="button"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button"
                  style={{ backgroundColor: "#3498db", color: "white" }}
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
