const express = require("express");
const router = express.Router();
const db = require("../models");
const { Sequelize } = require("sequelize");
const { Op } = Sequelize;
const { authenticateToken } = require("../middleware/authMiddleware");

// 🔹 Get employees under a manager
router.get("/manager/:managerId", authenticateToken, async (req, res) => {
  try {
    const { managerId } = req.params;
    const employees = await db.User.findAll({ where: { managerId } });
    res.json({ success: true, data: employees });
  } catch (err) {
    console.error("Error fetching manager's team:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch employees" });
  }
});

// 🔹 Get employee dashboard statistics
router.get("/dashboard-stats", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch all requests for the employee
    const [
      reimbursements,
      cashPayments,
      localTravel,
      outstationTravel,
      vendorPayments,
      vouchers,
    ] = await Promise.all([
      db.Reimbursement.findAll({
        where: { userId },
        attributes: ["id", "amount", "status", "createdAt"],
      }),
      db.CashPayment.findAll({
        where: { userId },
        attributes: ["id", "totalExpenses", "status", "createdAt"],
      }),
      db.LocalTravel.findAll({
        where: { userId },
        attributes: ["id", "totalExpenses", "status", "createdAt"],
      }),
      db.OutstationTravel.findAll({
        where: { userId },
        attributes: ["id", "totalExpenses", "status", "createdAt"],
      }),
      db.VendorPayment.findAll({
        where: { userId },
        attributes: ["id", "totalExpenses", "status", "createdAt"],
      }),
      db.Voucher.findAll({
        where: { employeeId: userId },
        attributes: ["id", "totalAmount", "status", "createdAt", "formType"],
      }),
    ]);

    // Calculate statistics
    const allRequests = [
      ...reimbursements.map((r) => ({
        amount: r.amount || 0,
        status: r.status || "pending",
        createdAt: r.createdAt,
      })),
      ...cashPayments.map((r) => ({
        amount: r.totalExpenses || 0,
        status: r.status || "pending",
        createdAt: r.createdAt,
      })),
      ...localTravel.map((r) => ({
        amount: r.totalExpenses || 0,
        status: r.status || "pending",
        createdAt: r.createdAt,
      })),
      ...outstationTravel.map((r) => ({
        amount: r.totalExpenses || 0,
        status: r.status || "pending",
        createdAt: r.createdAt,
      })),
      ...vendorPayments.map((r) => ({
        amount: r.totalExpenses || 0,
        status: r.status || "pending",
        createdAt: r.createdAt,
      })),
      ...vouchers.map((r) => ({
        amount: r.totalAmount || 0,
        status: r.status || "pending",
        createdAt: r.createdAt,
      })),
    ];

    const stats = {
      totalRequests: allRequests.length,
      pending: allRequests.filter(
        (r) => r.status === "pending" || r.status?.includes("pending")
      ).length,
      approved: allRequests.filter(
        (r) =>
          r.status === "approved" ||
          r.status === "manager_approved" ||
          r.status === "admin_approved" ||
          r.status === "managerApproved"
      ).length,
      rejected: allRequests.filter(
        (r) => r.status === "rejected" || r.status?.includes("rejected")
      ).length,
      totalAmount: allRequests.reduce(
        (sum, r) => sum + (parseFloat(r.amount) || 0),
        0
      ),
      pendingAmount: allRequests
        .filter((r) => r.status === "pending" || r.status?.includes("pending"))
        .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
      approvedAmount: allRequests
        .filter(
          (r) =>
            r.status === "approved" ||
            r.status === "manager_approved" ||
            r.status === "admin_approved" ||
            r.status === "managerApproved"
        )
        .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
      byFormType: {
        reimbursement: reimbursements.length,
        cash_payment: cashPayments.length,
        local_travel: localTravel.length,
        outstation_travel: outstationTravel.length,
        vendor_payment: vendorPayments.length,
        voucher: vouchers.length,
      },
    };

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error("Error fetching dashboard stats:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch dashboard statistics" });
  }
});

// 🔹 Get manager dashboard statistics and team requests
router.get("/manager/dashboard", authenticateToken, async (req, res) => {
  try {
    const managerId = req.user.id;
    if (req.user.role !== "manager") {
      return res.status(403).json({
        success: false,
        error: "Access denied. Manager role required.",
      });
    }

    // Get team members
    const teamMembers = await db.User.findAll({
      where: { managerId },
      attributes: ["id", "name", "email", "role"],
    });
    const teamIds = teamMembers.map((m) => m.id);

    // Fetch all team requests (excluding manager's own requests)
    // Use Op.in for proper array handling, return empty array if no team members
    const [
      reimbursements,
      cashPayments,
      localTravel,
      outstationTravel,
      vendorPayments,
      vouchers,
    ] = await Promise.all([
      teamIds.length > 0
        ? db.Reimbursement.findAll({
            where: { userId: { [Op.in]: teamIds } },
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["id", "name", "email"],
                required: false,
              },
            ],
            order: [["createdAt", "DESC"]],
            raw: false, // Keep Sequelize instances for toJSON()
          })
        : Promise.resolve([]),
      teamIds.length > 0
        ? db.CashPayment.findAll({
            where: { userId: { [Op.in]: teamIds } },
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["id", "name", "email"],
                required: false,
              },
            ],
            order: [["createdAt", "DESC"]],
            raw: false,
          })
        : Promise.resolve([]),
      teamIds.length > 0
        ? db.LocalTravel.findAll({
            where: { userId: { [Op.in]: teamIds } },
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["id", "name", "email"],
                required: false,
              },
            ],
            order: [["createdAt", "DESC"]],
            raw: false,
          })
        : Promise.resolve([]),
      teamIds.length > 0
        ? db.OutstationTravel.findAll({
            where: { userId: { [Op.in]: teamIds } },
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["id", "name", "email"],
                required: false,
              },
            ],
            order: [["createdAt", "DESC"]],
            raw: false,
          })
        : Promise.resolve([]),
      teamIds.length > 0
        ? db.VendorPayment.findAll({
            where: { userId: { [Op.in]: teamIds } },
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["id", "name", "email"],
                required: false,
              },
            ],
            order: [["createdAt", "DESC"]],
            raw: false,
          })
        : Promise.resolve([]),
      teamIds.length > 0
        ? db.Voucher.findAll({
            where: { employeeId: { [Op.in]: teamIds } },
            include: [
              {
                model: db.User,
                as: "employee",
                attributes: ["id", "name", "email"],
                required: false,
              },
              {
                model: db.User,
                as: "approver",
                attributes: ["id", "name", "email"],
                required: false,
              },
            ],
            order: [["createdAt", "DESC"]],
            raw: false,
          })
        : Promise.resolve([]),
    ]);

    // Helper function to safely convert Sequelize instances to JSON
    const toJSONSafe = (item) => {
      if (!item) return null;
      if (typeof item.toJSON === "function") return item.toJSON();
      if (Array.isArray(item)) return item.map(toJSONSafe);
      return item;
    };

    // Calculate statistics - convert to JSON first
    const allRequests = [
      ...reimbursements.map((r) => {
        const json = toJSONSafe(r);
        return {
          amount: json.amount || 0,
          status: json.status || "pending",
          createdAt: json.createdAt,
        };
      }),
      ...cashPayments.map((r) => {
        const json = toJSONSafe(r);
        return {
          amount: json.totalExpenses || 0,
          status: json.status || "pending",
          createdAt: json.createdAt,
        };
      }),
      ...localTravel.map((r) => {
        const json = toJSONSafe(r);
        return {
          amount: json.totalExpenses || 0,
          status: json.status || "pending",
          createdAt: json.createdAt,
        };
      }),
      ...outstationTravel.map((r) => {
        const json = toJSONSafe(r);
        return {
          amount: json.totalExpenses || 0,
          status: json.status || "pending",
          createdAt: json.createdAt,
        };
      }),
      ...vendorPayments.map((r) => {
        const json = toJSONSafe(r);
        return {
          amount: json.totalExpenses || 0,
          status: json.status || "pending",
          createdAt: json.createdAt,
        };
      }),
      ...vouchers.map((r) => {
        const json = toJSONSafe(r);
        return {
          amount: json.totalAmount || 0,
          status: json.status || "pending",
          createdAt: json.createdAt,
        };
      }),
    ];

    const stats = {
      teamMembers: teamMembers.length,
      totalRequests: allRequests.length,
      pending: allRequests.filter(
        (r) => r.status === "pending" || r.status?.includes("pending")
      ).length,
      approved: allRequests.filter(
        (r) =>
          r.status === "approved" ||
          r.status === "manager_approved" ||
          r.status === "admin_approved" ||
          r.status === "managerApproved"
      ).length,
      rejected: allRequests.filter(
        (r) => r.status === "rejected" || r.status?.includes("rejected")
      ).length,
      totalAmount: allRequests.reduce(
        (sum, r) => sum + (parseFloat(r.amount) || 0),
        0
      ),
      pendingAmount: allRequests
        .filter((r) => r.status === "pending" || r.status?.includes("pending"))
        .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
    };

    // Fetch manager's own requests
    const [
      managerReimbursements,
      managerCashPayments,
      managerLocalTravel,
      managerOutstationTravel,
      managerVendorPayments,
      managerVouchers,
    ] = await Promise.all([
      db.Reimbursement.findAll({
        where: { userId: managerId },
        include: [
          { model: db.User, as: "user", attributes: ["id", "name", "email"] },
        ],
        order: [["createdAt", "DESC"]],
      }),
      db.CashPayment.findAll({
        where: { userId: managerId },
        include: [
          { model: db.User, as: "user", attributes: ["id", "name", "email"] },
        ],
        order: [["createdAt", "DESC"]],
      }),
      db.LocalTravel.findAll({
        where: { userId: managerId },
        include: [
          { model: db.User, as: "user", attributes: ["id", "name", "email"] },
        ],
        order: [["createdAt", "DESC"]],
      }),
      db.OutstationTravel.findAll({
        where: { userId: managerId },
        include: [
          { model: db.User, as: "user", attributes: ["id", "name", "email"] },
        ],
        order: [["createdAt", "DESC"]],
      }),
      db.VendorPayment.findAll({
        where: { userId: managerId },
        include: [
          { model: db.User, as: "user", attributes: ["id", "name", "email"] },
        ],
        order: [["createdAt", "DESC"]],
      }),
      db.Voucher.findAll({
        where: { employeeId: managerId },
        include: [
          {
            model: db.User,
            as: "employee",
            attributes: ["id", "name", "email"],
          },
          {
            model: db.User,
            as: "approver",
            attributes: ["id", "name", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
      }),
    ]);

    res.json({
      success: true,
      data: {
        teamMembers: teamMembers.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role,
        })),
        stats,
        requests: {
          reimbursements: reimbursements.map((r) => ({
            ...toJSONSafe(r),
            formType: "reimbursement",
          })),
          cashPayments: cashPayments.map((r) => ({
            ...toJSONSafe(r),
            formType: "cash_payment",
          })),
          localTravel: localTravel.map((r) => ({
            ...toJSONSafe(r),
            formType: "local_travel",
          })),
          outstationTravel: outstationTravel.map((r) => ({
            ...toJSONSafe(r),
            formType: "outstation_travel",
          })),
          vendorPayments: vendorPayments.map((r) => ({
            ...toJSONSafe(r),
            formType: "vendor_payment",
          })),
          vouchers: vouchers.map((r) => ({
            ...toJSONSafe(r),
            formType: "voucher",
          })),
        },
        myRequests: {
          reimbursements: managerReimbursements.map((r) => ({
            ...toJSONSafe(r),
            formType: "reimbursement",
          })),
          cashPayments: managerCashPayments.map((r) => ({
            ...toJSONSafe(r),
            formType: "cash_payment",
          })),
          localTravel: managerLocalTravel.map((r) => ({
            ...toJSONSafe(r),
            formType: "local_travel",
          })),
          outstationTravel: managerOutstationTravel.map((r) => ({
            ...toJSONSafe(r),
            formType: "outstation_travel",
          })),
          vendorPayments: managerVendorPayments.map((r) => ({
            ...toJSONSafe(r),
            formType: "vendor_payment",
          })),
          vouchers: managerVouchers.map((r) => ({
            ...toJSONSafe(r),
            formType: "voucher",
          })),
        },
      },
    });
  } catch (err) {
    console.error("Error fetching manager dashboard:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch manager dashboard" });
  }
});

module.exports = router;
