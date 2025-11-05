const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploadFiles directory exists
const uploadDir = "uploadFiles";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage for general uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}_${file.originalname}`;
    cb(null, filename);
  },
});

// Helper factory for per-form folders
const formStorageFactory = (subdir) => multer.diskStorage({
  destination: (req, file, cb) => {
    const targetDir = path.join(uploadDir, subdir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}_${file.originalname}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });
const cashPaymentUpload = multer({ storage: formStorageFactory("CashPaymentForm") });
const localTravelUpload = multer({ storage: formStorageFactory("LocalTravelForm") });
const outstationTravelUpload = multer({ storage: formStorageFactory("OutstationTravelForm") });
const travelRequestUpload = multer({ storage: formStorageFactory("TravelRequestForm") });
const vendorPaymentUpload = multer({ storage: formStorageFactory("VendorPaymentForm") });

// General upload endpoint
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ 
    filePath: `/uploadFiles/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname
  });
});

// Cash payment specific upload endpoint
router.post("/cashPayments", cashPaymentUpload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ 
    filePath: `/uploadFiles/CashPaymentForm/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname
  });
});

// Local travel specific upload endpoint
router.post("/localTravel", localTravelUpload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ 
    filePath: `/uploadFiles/LocalTravelForm/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname
  });
});

// Outstation travel specific upload endpoint
router.post("/outstationTravel", outstationTravelUpload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ 
    filePath: `/uploadFiles/OutstationTravelForm/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname
  });
});



// Vendor payment specific upload endpoint
router.post("/vendorPayments", vendorPaymentUpload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  res.json({ 
    filePath: `/uploadFiles/VendorPaymentForm/${req.file.filename}`,
    filename: req.file.filename,
    originalName: req.file.originalname
  });
});

module.exports = router;
