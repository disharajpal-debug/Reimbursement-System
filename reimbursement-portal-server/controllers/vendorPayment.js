// controllers/vendorPaymentController.js
const db = require("../models");
const { VendorPayment, User } = db;
const { createVoucherFromForm } = require("../utils/voucherUtils");

// 🧾 Create Vendor Payment Request
exports.createVendorPaymentRequest = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const formData = req.body;

    // Create Vendor Payment Record
    const vendorPayment = await VendorPayment.create({
      ...formData,
      userId: user.id,
      status: "pending",
      manager_status: "pending",
      admin_status: "pending"
    });

    // Create Voucher for approval workflow
    try {
      await createVoucherFromForm(formData, "vendor_payment", user.id, user.name);
    } catch (voucherError) {
      console.error("Error creating voucher for vendor payment:", voucherError);
      // Don’t block main request if voucher creation fails
    }

    res.status(201).json({
      success: true,
      message: "Vendor payment request submitted successfully",
      data: vendorPayment
    });
  } catch (err) {
    console.error("createVendorPaymentRequest err:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// 📋 Get Vendor Payment Requests
exports.getVendorPaymentRequests = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    let whereClause = {};

    if (user.role === "employee") {
      whereClause.userId = user.id;
    } else if (user.role === "manager") {
      const teamMembers = await User.findAll({
        where: { managerId: user.id },
        attributes: ["id"]
      });
      const teamIds = teamMembers.map(member => member.id);
      whereClause.userId = teamIds;
    }

    const requests = await VendorPayment.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    res.json({
      success: true,
      data: requests
    });
  } catch (err) {
    console.error("getVendorPaymentRequests err:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ✅ Manager Approval
exports.managerApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const user = req.user;

    if (!user || user.role !== "manager")
      return res.status(403).json({ error: "Access denied" });

    const payment = await VendorPayment.findByPk(id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    await payment.update({
      manager_status: status,
      manager_reason: reason || null
    });

    res.json({
      success: true,
      message: "Manager decision recorded successfully"
    });
  } catch (err) {
    console.error("managerApproval err:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ✅ Admin Approval
exports.adminApproval = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const user = req.user;

    if (!user || user.role !== "admin")
      return res.status(403).json({ error: "Access denied" });

    const payment = await VendorPayment.findByPk(id);
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    await payment.update({
      admin_status: status,
      admin_reason: reason || null
    });

    res.json({
      success: true,
      message: "Admin decision recorded successfully"
    });
  } catch (err) {
    console.error("adminApproval err:", err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};
