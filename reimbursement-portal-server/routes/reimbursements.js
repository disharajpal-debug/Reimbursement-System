// routes/reimbursements.js
const express = require("express");
const router = express.Router();
const reimbursementController = require("../controllers/reimbursementController");
const { authenticateToken } = require("../middleware/authMiddleware");

// simple aliases
router.get("/", authenticateToken, reimbursementController.getReimbursements);
router.get("/myrequests", authenticateToken, reimbursementController.getMyRequests);
router.post("/", authenticateToken, reimbursementController.submitReimbursement);
router.patch("/:id/decision", authenticateToken, reimbursementController.approveReimbursement);

module.exports = router;
