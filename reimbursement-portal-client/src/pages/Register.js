import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    managerId: "",
  });

  const [managers, setManagers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch managers for dropdown
  useEffect(() => {
    const fetchManagers = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/auth/managers"); // ✅ fixed endpoint
        setManagers(res.data);
      } catch (err) {
        console.error("Error fetching managers:", err);
        setManagers([]);
      }
    };
    fetchManagers();
  }, []);

  // Handle input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.role === "employee" ? { managerId: form.managerId } : {}),
      };

      const res = await axios.post(
        "http://localhost:5000/api/auth/register",
        payload
      );

      alert(res.data.message);

      // ✅ Save token + user in localStorage (important for login session)
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        localStorage.setItem("role", res.data.user.role);
      }

      // ✅ Redirect based on role
      if (form.role === "employee") navigate("/employee-dashboard");
      else if (form.role === "manager") navigate("/manager-dashboard");
      else if (form.role === "admin") navigate("/admin-dashboard");

      // Reset form
      setForm({
        name: "",
        email: "",
        password: "",
        role: "",
        managerId: "",
      });
    } catch (err) {
      console.error("Registration failed:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Register</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            style={styles.input}
          />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            required
            style={styles.input}
          >
            <option value="">Select Role</option>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>

          {form.role === "employee" && (
            <select
              name="managerId"
              value={form.managerId}
              onChange={handleChange}
              required
              style={styles.input}
            >
              <option value="">Select Manager</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (ID: {m.id})
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
        <p style={{ marginTop: "15px", fontSize: "14px" }}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

// Inline CSS (same as Login styles)
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #2c3e50, #3498db, #6dd5fa)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    background: "#fff",
    padding: "35px 45px",
    borderRadius: "15px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
    width: "400px",
    textAlign: "center",
    transition: "transform 0.2s ease-in-out",
  },
  heading: {
    marginBottom: "20px",
    color: "#2c3e50",
    fontSize: "24px",
    fontWeight: "bold",
  },
  input: {
    width: "100%",
    padding: "14px",
    margin: "12px 0",
    border: "1px solid #ccc",
    borderRadius: "10px",
    fontSize: "15px",
    outline: "none",
    transition: "border-color 0.3s",
  },
  button: {
    width: "100%",
    padding: "14px",
    background: "#2980b9",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "15px",
    transition: "background 0.3s ease",
  },
  buttonDisabled: { background: "#bdc3c7", cursor: "not-allowed" },
  error: {
    color: "#e74c3c",
    marginBottom: "10px",
    fontWeight: "bold",
    fontSize: "14px",
  },
  link: {
    color: "#2980b9",
    textDecoration: "none",
    fontWeight: "bold",
    marginLeft: "5px",
  },
};

export default Register;
