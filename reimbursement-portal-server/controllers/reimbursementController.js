// controllers/reimbursementController.js
const db = require("../models");
const { Reimbursement, User } = db;
const { extractBillData } = require("../utils/ocr");

// Create / submit reimbursement (file via multer)
exports.submitReimbursement = async (req, res) => {
  try {
    const { type, amount, gst, description, autoFill } = req.body;
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!type || !amount)
      return res.status(400).json({ error: "Missing required fields" });

    let billImage = req.file ? `/uploads/${req.file.filename}` : null;
    let extractedData = {};

    if (autoFill && req.file) {
      try {
        extractedData = await extractBillData(req.file.path || req.file.buffer);
      } catch (e) {
        // don't fail whole request for OCR issues
        console.warn("OCR extract failed:", e.message || e);
      }
    }

    const reimbursement = await Reimbursement.create({
      userId,
      type,
      amount: parseFloat(amount),
      gst: gst ? parseFloat(gst) : extractedData.gst || 0,
      description: description || extractedData.description || "",
      billImage,
      status: "pending",
    });

    res.status(201).json({ message: "Reimbursement submitted", reimbursement });
  } catch (err) {
    console.error("submitReimbursement error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get user's own reimbursements
exports.getMyRequests = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const reimbursements = await Reimbursement.findAll({
      where: { userId: user.id },
      order: [["createdAt", "DESC"]],
    });

    res.json(reimbursements);
  } catch (err) {
    console.error("getMyRequests error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Get reimbursements: if user, only theirs; if manager or admin, more
exports.getReimbursements = async (req, res) => {
  try {
    const user = req.user;
    let reimbursements = [];
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    if (user.role === "employee") {
      reimbursements = await Reimbursement.findAll({
        where: { userId: user.id },
      });
    } else if (user.role === "manager") {
      // manager: get reimbursements of his team (users with managerId = manager's id)
      const team = await User.findAll({
        where: { managerId: user.id },
        attributes: ["id"],
      });
      const teamIds = team.map((t) => t.id);
      reimbursements = await Reimbursement.findAll({
        where: { userId: teamIds },
      });
    } else if (user.role === "admin") {
      reimbursements = await Reimbursement.findAll();
    }

    res.json(reimbursements);
  } catch (err) {
    console.error("getReimbursements error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.approveReimbursement = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; // 'approved' or 'rejected'
    const user = req.user;

    if (!["approved", "rejected", "pending"].includes(action))
      return res.status(400).json({ error: "Invalid action" });

    const reimbursement = await Reimbursement.findByPk(id);
    if (!reimbursement)
      return res.status(404).json({ error: "Reimbursement not found" });

    // If manager is approving, set status to manager_approved
    if (user.role === "manager" && action === "approved") {
      reimbursement.status = "manager_approved";
      reimbursement.managerApprovedBy = user.id;
      reimbursement.managerApprovedAt = new Date();
      if (reason) reimbursement.managerReason = reason;
    } else if (user.role === "manager" && action === "rejected") {
      reimbursement.status = "rejected";
      reimbursement.rejectedBy = user.id;
      reimbursement.rejectedAt = new Date();
      if (reason) reimbursement.rejectionReason = reason;
    } else {
      reimbursement.status = action;
    }

    await reimbursement.save();

    res.json({ message: `Reimbursement ${action}`, reimbursement });
  } catch (err) {
    console.error("approveReimbursement error:", err);
    res.status(500).json({ error: err.message });
  }
};
