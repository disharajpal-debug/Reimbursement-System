// routes/admin.js
const express = require("express");
const router = express.Router();
const db = require("../models");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const { User } = db;

// Admin: list all users
router.get("/users", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const users = await User.findAll({ attributes: ["id", "name", "email", "role", "managerId"] });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: assign/modify manager for user
router.patch("/assign-manager/:id", authenticateToken, authorizeRoles("admin"), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Employee not found" });

    const { managerId } = req.body;
    user.managerId = managerId || null;
    await user.save();
    res.json({ message: "Manager assigned successfully", user });
  } catch (err) {
    console.error("❌ Error assigning manager:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Admin/Manager: Get cash payments (admin: all, manager: team)
router.get("/cash-payments", authenticateToken, authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const payments = await db.CashPayment.findAll({
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'managerId'] }],
        order: [['createdAt', 'DESC']]
      });
      return res.json(payments);
    }
    // manager: filter by team
    const team = await User.findAll({ where: { managerId: req.user.id }, attributes: ['id'] });
    const teamIds = team.map(t => t.id);
    const payments = await db.CashPayment.findAll({
      where: { userId: teamIds },
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'managerId'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(payments);
  } catch (err) {
    console.error("❌ Error fetching cash payments:", err);
    res.status(500).json({ error: "Failed to fetch cash payments" });
  }
});

// Admin/Manager: Update cash payment status
router.patch("/cash-payments/:id/status", authenticateToken, authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const { status } = req.body;
    const payment = await db.CashPayment.findByPk(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ error: "Cash payment not found" });
    }

    payment.status = status;
    await payment.save();
    
    res.json({ 
      success: true, 
      message: "Cash payment status updated successfully",
      payment 
    });
  } catch (err) {
    console.error("❌ Error updating cash payment status:", err);
    res.status(500).json({ error: "Failed to update cash payment status" });
  }
});

module.exports = router;
