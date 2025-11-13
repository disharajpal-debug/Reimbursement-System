// src/utils/api.js
import axios from "axios";

// ✅ Set backend base URL based on environment
const baseURL =
  process.env.NODE_ENV === "production"
    ? "https://reimbursement-system-backend.vercel.app/api"
    : "http://localhost:5000/api";

const API = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ Attach JWT token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
