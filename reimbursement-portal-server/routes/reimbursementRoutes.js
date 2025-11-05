// routes/reimbursementRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");
const reimbursementController = require("../controllers/reimbursementController");

// multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Submit reimbursement (employee)
router.post("/", authenticateToken, upload.single("file"), reimbursementController.submitReimbursement);

// Get reimbursements (varies by role)
router.get("/", authenticateToken, reimbursementController.getReimbursements);

// Get my reimbursements
router.get("/myrequests", authenticateToken, reimbursementController.getMyRequests);

// Approve/reject (manager/admin)
router.patch("/:id/decision", authenticateToken, authorizeRoles("manager", "admin"), reimbursementController.approveReimbursement);

module.exports = router;
