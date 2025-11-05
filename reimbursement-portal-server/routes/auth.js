// routes/auth.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { register, login } = require("../controllers/authController");

// Multer just in case
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Duplicate / alternate auth routes (if used anywhere)
router.post("/register", register);
router.post("/login", login);

module.exports = router;
