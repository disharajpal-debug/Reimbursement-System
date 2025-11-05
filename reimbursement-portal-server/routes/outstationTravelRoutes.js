// routes/outstationTravelRoutes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const outstationTravelController = require("../controllers/outstationTravelController");
const db = require("../models");

router.post(
  "/",
  authenticateToken,
  outstationTravelController.createOutstationTravelRequest
);
router.get(
  "/",
  authenticateToken,
  outstationTravelController.getOutstationTravelRequests
);

// Manager approval/rejection
router.put("/:id/manager-action", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    if (req.user.role !== "manager") {
      return res
        .status(403)
        .json({
          success: false,
          error: "Access denied. Manager role required.",
        });
    }

    const travel = await db.OutstationTravel.findByPk(id);
    if (!travel) {
      return res
        .status(404)
        .json({ success: false, error: "Outstation travel request not found" });
    }

    // Verify this request belongs to manager's team
    const teamMembers = await db.User.findAll({
      where: { managerId: req.user.id },
      attributes: ["id"],
    });
    const teamIds = teamMembers.map((m) => m.id);

    if (!teamIds.includes(travel.userId)) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Access denied. This request does not belong to your team.",
        });
    }

    if (action === "approve") {
      travel.status = "manager_approved";
      travel.managerApprovedBy = req.user.id;
      travel.managerApprovedAt = new Date();
      if (reason) travel.managerReason = reason;
    } else if (action === "reject") {
      travel.status = "rejected";
      travel.rejectedBy = req.user.id;
      travel.rejectedAt = new Date();
      travel.rejectionReason = reason || "Rejected by manager";
    } else {
      return res
        .status(400)
        .json({
          success: false,
          error: "Invalid action. Must be 'approve' or 'reject'",
        });
    }

    await travel.save();
    res.json({
      success: true,
      message: `Outstation travel request ${action}d successfully`,
      data: travel,
    });
  } catch (err) {
    console.error("Error updating outstation travel status:", err);
    res
      .status(500)
      .json({
        success: false,
        error: "Failed to update outstation travel status",
      });
  }
});

module.exports = router;
