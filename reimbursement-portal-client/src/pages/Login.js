import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../utils/api";
import "./Login.css"; // ✅ Import external CSS

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle login submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await API.post("/auth/login", formData);

      const { token, user } = res.data;
      const role = user.role?.toLowerCase();

      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("user", JSON.stringify(user));

      if (role === "admin") navigate("/admin-dashboard");
      else if (role === "manager") navigate("/manager-dashboard");
      else if (role === "employee") navigate("/employee-dashboard");
      else setError("Unknown role. Contact admin.");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.response?.data?.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-heading">Login</h2>
        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
            className="login-input"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            className="login-input"
          />
          <button
            type="submit"
            disabled={loading}
            className={`login-button ${loading ? "login-button-disabled" : ""}`}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="login-footer">
          Don’t have an account?
          <Link to="/register" className="login-link">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
