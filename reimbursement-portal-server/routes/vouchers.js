const express = require("express");
const router = express.Router();
const db = require("../models");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const voucherController = require("../controllers/voucherController");

// 🔹 Get all vouchers (for manager/admin)
router.get(
  "/",
  authenticateToken,
  authorizeRoles("manager", "admin"),
  async (req, res) => {
    try {
      const vouchers = await db.Voucher.findAll({
        order: [["createdAt", "DESC"]],
      });
      res.json({ success: true, data: vouchers });
    } catch (err) {
      console.error("Error fetching vouchers:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch vouchers" });
    }
  }
);

// 🔹 Get employee's own vouchers
router.get("/my-vouchers", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const vouchers = await db.Voucher.findAll({
      where: { employeeId: userId },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.User,
          as: "employee",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: db.User,
          as: "approver",
          attributes: ["id", "name", "email"],
        },
      ],
    });
    res.json({ success: true, data: vouchers });
  } catch (err) {
    console.error("Error fetching employee vouchers:", err);
    res.status(500).json({ success: false, error: "Failed to fetch vouchers" });
  }
});

// 🔹 Get voucher by ID (for employee to view their own voucher)
router.get("/:id", authenticateToken, voucherController.getVoucherById);

// 🔹 Manager approval/rejection with reason
router.put("/:id/manager-action", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'reject'

    if (req.user.role !== "manager") {
      return res
        .status(403)
        .json({
          success: false,
          error: "Access denied. Manager role required.",
        });
    }

    const voucher = await db.Voucher.findByPk(id);
    if (!voucher) {
      return res
        .status(404)
        .json({ success: false, error: "Voucher not found" });
    }

    // Verify this voucher belongs to manager's team
    const teamMembers = await db.User.findAll({
      where: { managerId: req.user.id },
      attributes: ["id"],
    });
    const teamIds = teamMembers.map((m) => m.id);

    if (!teamIds.includes(voucher.employeeId)) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Access denied. This voucher does not belong to your team.",
        });
    }

    if (action === "approve") {
      voucher.status = "managerApproved";
      voucher.managerApprovedBy = req.user.id;
      voucher.managerApprovedAt = new Date();
      if (reason) voucher.managerReason = reason;
    } else if (action === "reject") {
      voucher.status = "rejected";
      voucher.rejectedBy = req.user.id;
      voucher.rejectedAt = new Date();
      voucher.rejectionReason = reason || "Rejected by manager";
    } else {
      return res
        .status(400)
        .json({
          success: false,
          error: "Invalid action. Must be 'approve' or 'reject'",
        });
    }

    await voucher.save();

    const updatedVoucher = await db.Voucher.findByPk(id, {
      include: [
        { model: db.User, as: "employee", attributes: ["id", "name", "email"] },
        { model: db.User, as: "approver", attributes: ["id", "name", "email"] },
      ],
    });

    res.json({
      success: true,
      message: `Voucher ${action}d successfully`,
      data: updatedVoucher,
    });
  } catch (err) {
    console.error("Error updating voucher status:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update voucher status" });
  }
});

// 🔹 Update voucher status (manager or admin approval) - Legacy endpoint
router.put("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const voucher = await db.Voucher.findByPk(id);
    if (!voucher)
      return res
        .status(404)
        .json({ success: false, error: "Voucher not found" });

    // If manager approves → mark as "managerApproved"
    if (req.user.role === "manager" && status === "approved") {
      voucher.status = "managerApproved";
      voucher.managerApprovedBy = req.user.id;
      voucher.managerApprovedAt = new Date();
      if (reason) voucher.managerReason = reason;
    }
    // If admin approves → mark as fully "approved"
    else if (req.user.role === "admin" && status === "approved") {
      voucher.status = "approved";
    }
    // Rejection by anyone
    else if (status === "rejected") {
      voucher.status = "rejected";
      voucher.rejectedBy = req.user.id;
      voucher.rejectedAt = new Date();
      if (reason) voucher.rejectionReason = reason;
    }

    await voucher.save();
    res.json({ success: true, data: voucher });
  } catch (err) {
    console.error("Error updating voucher status:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update voucher status" });
  }
});

module.exports = router;
