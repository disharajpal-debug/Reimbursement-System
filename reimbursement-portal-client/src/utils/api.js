// src/utils/api.js
import axios from "axios";

// ✅ Set backend base URL
const API = axios.create({
  baseURL: "https://reimbursement-system-backend.vercel.app/api",
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
