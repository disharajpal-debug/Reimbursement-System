const db = require("../models");
const { Op } = require("sequelize");

// Generate unique voucher number
const generateVoucherNumber = async () => {
  const prefix = "VCH";
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, "0");

  // Find the last voucher number for this month
  const lastVoucher = await db.Voucher.findOne({
    where: {
      voucherNo: {
        [Op.like]: `${prefix}${year}${month}%`,
      },
    },
    order: [["voucherNo", "DESC"]],
  });

  let sequence = 1;
  if (lastVoucher) {
    const lastSequence = parseInt(lastVoucher.voucherNo.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${year}${month}${String(sequence).padStart(4, "0")}`;
};

// Create voucher from form data
const createVoucher = async (req, res) => {
  try {
    const { formType, formData, employeeId, employeeName } = req.body;

    if (!formType || !formData || !employeeId || !employeeName) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: formType, formData, employeeId, employeeName",
      });
    }

    // Generate voucher number
    const voucherNo = await generateVoucherNumber();

    // Calculate total amount based on form type
    let totalAmount = 0;
    switch (formType) {
      case "cash_payment":
        totalAmount = formData.totalExpenses || 0;
        break;
      case "local_travel":
        totalAmount = formData.totalExpenses || 0;
        break;
      case "outstation_travel":
        totalAmount = formData.totalExpenses || 0;
        break;
      case "vendor_payment":
        totalAmount = formData.totalExpenses || 0;
        break;
      case "reimbursement":
        totalAmount = formData.amount || 0;
        break;
      default:
        totalAmount = 0;
    }

    const voucherData = {
      voucherNo,
      employeeName,
      employeeId,
      formType,
      formData,
      totalAmount,
      proofs: formData.proofs || formData.bills || [],
      projectName: formData.projectName || null,
      ecLocation: formData.ecLocation || "Pune",
      description: formData.description || null,
      createdBy: req.user.id,
      status: "pending",
    };

    const voucher = await db.Voucher.create(voucherData);

    res.status(201).json({
      success: true,
      message: "Voucher created successfully",
      data: voucher,
    });
  } catch (error) {
    console.error("Error creating voucher:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create voucher",
      details: error.message,
    });
  }
};

// Get all vouchers for admin
const getAllVouchers = async (req, res) => {
  try {
    const { status, formType, page = 1, limit = 10 } = req.query;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (formType) whereClause.formType = formType;

    const offset = (page - 1) * limit;

    const vouchers = await db.Voucher.findAndCountAll({
      where: whereClause,
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
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: vouchers.rows,
      pagination: {
        total: vouchers.count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(vouchers.count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch vouchers",
      details: error.message,
    });
  }
};

// Get voucher by ID
const getVoucherById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const voucher = await db.Voucher.findByPk(id, {
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

    if (!voucher) {
      return res.status(404).json({
        success: false,
        error: "Voucher not found",
      });
    }

    // If employee, only allow access to their own vouchers
    if (user.role === "employee" && voucher.employeeId !== user.id) {
      return res.status(403).json({
        success: false,
        error: "Access denied. You can only view your own vouchers.",
      });
    }

    res.json({
      success: true,
      data: voucher,
    });
  } catch (error) {
    console.error("Error fetching voucher:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch voucher",
      details: error.message,
    });
  }
};

// Update voucher status (approve/reject)
const updateVoucherStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, remarks } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be "approved" or "rejected"',
      });
    }

    const voucher = await db.Voucher.findByPk(id);
    if (!voucher) {
      return res.status(404).json({
        success: false,
        error: "Voucher not found",
      });
    }

    const updateData = {
      status,
      updatedBy: req.user.id,
    };

    if (status === "approved") {
      updateData.approvedBy = req.user.id;
      updateData.approvedAt = new Date();
    } else if (status === "rejected") {
      updateData.rejectedBy = req.user.id;
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = rejectionReason;
    }

    if (remarks) {
      updateData.remarks = remarks;
    }

    await voucher.update(updateData);

    // Fetch updated voucher with associations
    const updatedVoucher = await db.Voucher.findByPk(id, {
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

    res.json({
      success: true,
      message: `Voucher ${status} successfully`,
      data: updatedVoucher,
    });
  } catch (error) {
    console.error("Error updating voucher status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update voucher status",
      details: error.message,
    });
  }
};

// Mark voucher as completed (transaction completed)
const markVoucherCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionDate, remarks } = req.body;

    const voucher = await db.Voucher.findByPk(id);
    if (!voucher) {
      return res.status(404).json({
        success: false,
        error: "Voucher not found",
      });
    }

    if (voucher.status !== "approved") {
      return res.status(400).json({
        success: false,
        error: "Only approved vouchers can be marked as completed",
      });
    }

    const updateData = {
      status: "completed",
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      completedBy: req.user.id,
      completedAt: new Date(),
      updatedBy: req.user.id,
    };

    if (remarks) {
      updateData.remarks = remarks;
    }

    await voucher.update(updateData);

    // Fetch updated voucher with associations
    const updatedVoucher = await db.Voucher.findByPk(id, {
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

    res.json({
      success: true,
      message: "Voucher marked as completed successfully",
      data: updatedVoucher,
    });
  } catch (error) {
    console.error("Error marking voucher as completed:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mark voucher as completed",
      details: error.message,
    });
  }
};

// Get vouchers by employee
const getEmployeeVouchers = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { status, formType } = req.query;

    const whereClause = { employeeId };
    if (status) whereClause.status = status;
    if (formType) whereClause.formType = formType;

    const vouchers = await db.Voucher.findAll({
      where: whereClause,
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
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: vouchers,
    });
  } catch (error) {
    console.error("Error fetching employee vouchers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch employee vouchers",
      details: error.message,
    });
  }
};

module.exports = {
  createVoucher,
  getAllVouchers,
  getVoucherById,
  updateVoucherStatus,
  markVoucherCompleted,
  getEmployeeVouchers,
};
