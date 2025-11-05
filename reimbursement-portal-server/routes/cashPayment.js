const express = require("express");
const router = express.Router();
const db = require("../models");
const { authenticateToken } = require("../middleware/authMiddleware");

// Save Cash Payment
router.post("/", authenticateToken, async (req, res) => {
  try {
    console.log(
      "Received cash payment data:",
      JSON.stringify(req.body, null, 2)
    );
    console.log("User from token:", req.user);

    // Validate required fields
    if (!req.body.employeeName || !req.body.voucherNo) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        details: "employeeName and voucherNo are required",
      });
    }

    const paymentData = {
      employeeName: req.body.employeeName,
      date: req.body.date,
      voucherNo: req.body.voucherNo,
      paymentDate: req.body.paymentDate,
      projectName: req.body.projectName,
      ecLocation: req.body.ecLocation || "Pune",
      bills: req.body.bills || [],
      totalExpenses: parseFloat(req.body.totalExpenses) || 0,
      advancePayment: parseFloat(req.body.advancePayment) || 0,
      balanceReimbursement: parseFloat(req.body.balanceReimbursement) || 0,
      amtInWords: req.body.amtInWords || "",
      preparedBy: req.body.preparedBy || "",
      receiverSign: req.body.receiverSign || "",
      accountsSign: req.body.accountsSign || "",
      authorizedSignatory: req.body.authorizedSignatory || "",
      userId: req.user.id || 1, // Fallback to 1 if no user ID
    };

    console.log(
      "Payment data to create:",
      JSON.stringify(paymentData, null, 2)
    );

    const payment = await db.CashPayment.create(paymentData);

    console.log("Cash payment created successfully:", payment.id);
    res.status(201).json({
      success: true,
      message: "Cash payment created successfully",
      data: payment,
    });
  } catch (err) {
    console.error("Cash payment creation error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({
      success: false,
      error: "Failed to save payment",
      details: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
});

// Fetch all cash payments (for testing)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const payments = await db.CashPayment.findAll();
    res.json(payments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// Fetch user's own cash payments
router.get("/my-payments", authenticateToken, async (req, res) => {
  try {
    const payments = await db.CashPayment.findAll({
      where: { userId: req.user.id },
      order: [["createdAt", "DESC"]],
    });
    res.json(payments);
  } catch (err) {
    console.error("Error fetching user's cash payments:", err);
    res.status(500).json({ error: "Failed to fetch user's payments" });
  }
});

// Manager approval/rejection
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

    const payment = await db.CashPayment.findByPk(id);
    if (!payment) {
      return res
        .status(404)
        .json({ success: false, error: "Cash payment not found" });
    }

    // Verify this payment belongs to manager's team
    const teamMembers = await db.User.findAll({
      where: { managerId: req.user.id },
      attributes: ["id"],
    });
    const teamIds = teamMembers.map((m) => m.id);

    if (!teamIds.includes(payment.userId)) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Access denied. This payment does not belong to your team.",
        });
    }

    if (action === "approve") {
      payment.status = "manager_approved";
      payment.managerApprovedBy = req.user.id;
      payment.managerApprovedAt = new Date();
      if (reason) payment.managerReason = reason;
    } else if (action === "reject") {
      payment.status = "rejected";
      payment.rejectedBy = req.user.id;
      payment.rejectedAt = new Date();
      payment.rejectionReason = reason || "Rejected by manager";
    } else {
      return res
        .status(400)
        .json({
          success: false,
          error: "Invalid action. Must be 'approve' or 'reject'",
        });
    }

    await payment.save();
    res.json({
      success: true,
      message: `Cash payment ${action}d successfully`,
      data: payment,
    });
  } catch (err) {
    console.error("Error updating cash payment status:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update cash payment status" });
  }
});

module.exports = router;
