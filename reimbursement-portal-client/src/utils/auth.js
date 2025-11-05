// src/utils/auth.js

// Save token
export const login = (token, role) => {
  localStorage.setItem("token", token);
  localStorage.setItem("role", role);
};

// Logout user
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
};

// Get token
export const getToken = () => localStorage.getItem("token");

// Get role
export const getRole = () => localStorage.getItem("role");

// Check if logged in
export const isAuthenticated = () => !!localStorage.getItem("token");
