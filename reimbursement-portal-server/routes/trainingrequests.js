// routes/trainingrequests.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");

// Simple placeholders:
router.post("/", authenticateToken, async (req, res) => {
  res.json({ message: "Training request submitted (placeholder)" });
});

router.get("/", authenticateToken, async (req, res) => {
  res.json({ message: "List training requests (placeholder)" });
});

module.exports = router;
