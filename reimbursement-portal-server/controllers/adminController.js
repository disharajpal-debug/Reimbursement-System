const db = require("../models");
const { Op } = require("sequelize");

// Fetch all requests with detailed information for admin dashboard
exports.getDashboardData = async (req, res) => {
  try {
    console.log("Fetching admin dashboard data");

    // Get all users
    const users = await db.User.findAll({
      attributes: ["id", "name", "email", "role", "managerId"],
      raw: true,
    });

    // Fetch all types of requests with user information
    const [
      reimbursements,
      cashPayments,
      localTravel,
      outstationTravel,
      vendorPayments,
      vouchers,
    ] = await Promise.all([
      db.Reimbursement.findAll({
        include: [
          {
            model: db.User,
            as: "user",
            attributes: ["id", "name", "email", "role"],
          },
        ],
        order: [["createdAt", "DESC"]],
      }),
      db.CashPayment.findAll({
        include: [
          {
            model: db.User,
            as: "user",
            attributes: ["id", "name", "email", "role"],
          },
        ],
        order: [["createdAt", "DESC"]],
      }),
      db.LocalTravel.findAll({
        include: [
          {
            model: db.User,
            as: "user",
            attributes: ["id", "name", "email", "role"],
          },
        ],
        order: [["createdAt", "DESC"]],
      }),
      db.OutstationTravel.findAll({
        include: [
          {
            model: db.User,
            as: "user",
            attributes: ["id", "name", "email", "role"],
          },
        ],
        order: [["createdAt", "DESC"]],
      }),
      db.VendorPayment.findAll({
        include: [
          {
            model: db.User,
            as: "user",
            attributes: ["id", "name", "email", "role"],
          },
        ],
        order: [["createdAt", "DESC"]],
      }),
      db.Voucher.findAll({
        include: [
          {
            model: db.User,
            as: "employee",
            attributes: ["id", "name", "email", "role"],
          },
          {
            model: db.User,
            as: "approver",
            attributes: ["id", "name", "email", "role"],
          },
        ],
        order: [["createdAt", "DESC"]],
      }),
    ]);

    // Calculate statistics
    const requests = {
      reimbursements: reimbursements.map((r) => r.toJSON()),
      cashPayments: cashPayments.map((r) => r.toJSON()),
      localTravel: localTravel.map((r) => r.toJSON()),
      outstationTravel: outstationTravel.map((r) => r.toJSON()),
      vendorPayments: vendorPayments.map((r) => r.toJSON()),
      vouchers: vouchers.map((r) => r.toJSON()),
    };

    const allRequests = [
      ...reimbursements,
      ...cashPayments,
      ...localTravel,
      ...outstationTravel,
      ...vendorPayments,
      ...vouchers,
    ].map((r) => r.toJSON());

    // Calculate totals and statistics
    const stats = {
      users: {
        total: users.length,
        employees: users.filter((u) => u.role === "employee").length,
        managers: users.filter((u) => u.role === "manager").length,
      },
      requests: {
        total: allRequests.length,
        pending: allRequests.filter(
          (r) => r.status === "pending" || r.status?.includes("pending")
        ).length,
        approved: allRequests.filter(
          (r) => r.status === "approved" || r.status?.includes("approved")
        ).length,
        rejected: allRequests.filter(
          (r) => r.status === "rejected" || r.status?.includes("rejected")
        ).length,
      },
      amounts: {
        total: allRequests.reduce(
          (sum, r) =>
            sum +
            (parseFloat(r.amount || r.totalAmount || r.totalExpenses || 0) ||
              0),
          0
        ),
        pending: allRequests
          .filter(
            (r) => r.status === "pending" || r.status?.includes("pending")
          )
          .reduce(
            (sum, r) =>
              sum +
              (parseFloat(r.amount || r.totalAmount || r.totalExpenses || 0) ||
                0),
            0
          ),
        approved: allRequests
          .filter(
            (r) => r.status === "approved" || r.status?.includes("approved")
          )
          .reduce(
            (sum, r) =>
              sum +
              (parseFloat(r.amount || r.totalAmount || r.totalExpenses || 0) ||
                0),
            0
          ),
      },
      byType: {
        reimbursements: reimbursements.length,
        cashPayments: cashPayments.length,
        localTravel: localTravel.length,
        outstationTravel: outstationTravel.length,
        vendorPayments: vendorPayments.length,
        vouchers: vouchers.length,
      },
    };

    res.json({
      success: true,
      data: {
        stats,
        users,
        requests,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in admin dashboard:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch admin dashboard data",
      details: error.message,
    });
  }
};

// Handle request approval/rejection
exports.handleRequestAction = async (req, res) => {
  try {
    const { requestId, formType, action, reason } = req.body;
    const adminId = req.user.id;

    if (!requestId || !formType || !action) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters",
      });
    }

    let model;
    switch (formType.toLowerCase()) {
      case "reimbursement":
        model = db.Reimbursement;
        break;
      case "cash_payment":
        model = db.CashPayment;
        break;
      case "local_travel":
        model = db.LocalTravel;
        break;
      case "outstation_travel":
        model = db.OutstationTravel;
        break;
      case "vendor_payment":
        model = db.VendorPayment;
        break;
      case "voucher":
        model = db.Voucher;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Invalid form type",
        });
    }

    const request = await model.findByPk(requestId);
    if (!request) {
      return res.status(404).json({
        success: false,
        error: "Request not found",
      });
    }

    // Update request status
    request.status = action === "approve" ? "admin_approved" : "admin_rejected";
    request.adminId = adminId;
    request.adminActionAt = new Date();
    request.adminReason = reason || null;

    await request.save();

    res.json({
      success: true,
      message: `Request ${action}d successfully`,
      request: request.toJSON(),
    });
  } catch (error) {
    console.error("Error in request action:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process request action",
      details: error.message,
    });
  }
};
