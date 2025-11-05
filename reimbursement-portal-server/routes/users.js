// routes/users.js
const express = require("express");
const router = express.Router();
const db = require("../models");
const { User } = db;
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");

// Get all users (admin only)
router.get("/", authenticateToken, authorizeRoles("admin","manager"), async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ["id", "name", "email", "role", "managerId"] });
    res.json(users);
  } catch (err) {
    console.error("GET /users err:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single user (self or admin)
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "role", "managerId"], // no signature
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("❌ /me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
