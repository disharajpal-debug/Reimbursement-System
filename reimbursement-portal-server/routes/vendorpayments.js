// routes/vendorpayments.js
const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const db = require("../models");
const { createVoucherFromForm } = require("../utils/voucherUtils");

// ✅ List vendor payments (for manager/admin)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    let whereClause = {};

    // If employee, only show their own payments
    if (user.role === "employee") {
      whereClause.userId = user.id;
    }
    // If manager, show their team's payments
    else if (user.role === "manager") {
      const teamMembers = await db.User.findAll({
        where: { managerId: user.id },
        attributes: ["id"],
      });
      const teamIds = teamMembers.map((member) => member.id);
      whereClause.userId = teamIds;
    }
    // Admin can see all (no whereClause)

    const payments = await db.VendorPayment.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
      ],
    });
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error("VendorPayments list error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch vendor payments" });
  }
});

// ✅ Get employee's own vendor payments
router.get("/my-payments", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const payments = await db.VendorPayment.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
      ],
    });
    res.json({ success: true, data: payments });
  } catch (err) {
    console.error("Error fetching employee vendor payments:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch vendor payments" });
  }
});

// ✅ Create vendor payment (employee submission)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const body = req.body || {};
    const vendorName = body.vendorName || "";
    const date = body.date || new Date().toISOString().slice(0, 10);
    const voucherNo = body.voucherNo || null;
    const ecLocation = body.ecLocation || "Pune";
    const bills = Array.isArray(body.bills) ? body.bills : [];
    const totalExpenses = Number(
      body.totalExpenses ||
        bills.reduce((s, b) => s + (Number(b.amount) || 0), 0)
    );
    const amtInWords = body.amtInWords || "";
    const preparedBy = body.preparedBy || req.user.name || "";
    const proofs = Array.isArray(body.proofs) ? body.proofs : [];

    const payload = {
      vendorName,
      date,
      voucherNo: voucherNo || "",
      ecLocation,
      bills,
      totalExpenses,
      amtInWords,
      preparedBy,
      proofs,
      userId,
      status: "pending",
      manager_status: "pending",
      admin_status: "pending",
      manager_reason: null,
      admin_reason: null,
    };

    const created = await db.VendorPayment.create(payload);

    // Do not auto-create a Voucher here to avoid duplicating the request in
    // both VendorPayment and Voucher tables. If a voucher is needed, create
    // it explicitly from a dedicated endpoint or background job.

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error("VendorPayments create error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to create vendor payment" });
  }
});

// ✅ Manager Approval (legacy endpoint)
router.put(
  "/manager/:id",
  authenticateToken,
  authorizeRoles("manager"),
  async (req, res) => {
    try {
      const { status, reason } = req.body;
      const payment = await db.VendorPayment.findByPk(req.params.id);
      if (!payment)
        return res.status(404).json({ error: "Vendor payment not found" });

      await payment.update({
        manager_status: status,
        manager_reason: reason || null,
      });

      res.json({ success: true, message: "Manager approval updated" });
    } catch (err) {
      console.error("Manager approval error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to update manager approval" });
    }
  }
);

// Manager approval/rejection with team verification
router.put("/:id/manager-action", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (req.user.role !== "manager") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Manager role required.",
      });
    }

    const payment = await db.VendorPayment.findByPk(id);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, error: "Vendor payment not found" });
    }

    // Verify this payment belongs to manager's team
    const teamMembers = await db.User.findAll({
      where: { managerId: req.user.id },
      attributes: ["id"],
    });
    const teamIds = teamMembers.map((m) => m.id);

    if (!teamIds.includes(payment.userId)) {
      return res.status(403).json({
        success: false,
        error: "Access denied. This payment does not belong to your team.",
      });
    }

    if (action === "approve") {
      payment.manager_status = "approved";
      payment.status = "manager_approved";
      payment.manager_reason = reason || null;
    } else if (action === "reject") {
      payment.manager_status = "rejected";
      payment.status = "rejected";
      payment.manager_reason = reason || "Rejected by manager";
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid action. Must be 'approve' or 'reject'",
      });
    }

    await payment.save();
    res.json({
      success: true,
      message: `Vendor payment ${action}d successfully`,
      data: payment,
    });
  } catch (err) {
    console.error("Error updating vendor payment status:", err);
    res.status(500).json({
      success: false,
      error: "Failed to update vendor payment status",
    });
  }
});

// ✅ Admin Approval
router.put(
  "/admin/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { status, reason } = req.body;
      const payment = await db.VendorPayment.findByPk(req.params.id);
      if (!payment)
        return res.status(404).json({ error: "Vendor payment not found" });

      await payment.update({
        admin_status: status,
        admin_reason: reason || null,
      });

      res.json({ success: true, message: "Admin approval updated" });
    } catch (err) {
      console.error("Admin approval error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to update admin approval" });
    }
  }
);

module.exports = router;
