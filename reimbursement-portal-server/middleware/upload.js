const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create base upload directory
const baseUploadDir = path.join(__dirname, "../uploadFiles");

// Define upload types and their directories
const uploadTypes = [
  "CashPaymentForm",
  "LocalTravelForm",
  "OutstationTravelForm",
  "TravelRequestForm",
  "VendorPaymentForm",
];

// Create directories if they don't exist
uploadTypes.forEach((type) => {
  const dir = path.join(baseUploadDir, type);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get the form type from the request
    const formType = req.params.formType || "CashPaymentForm";
    const uploadDir = path.join(baseUploadDir, formType);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  },
});

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, PDF and DOC files are allowed."
      ),
      false
    );
  }
};

// Configure multer with storage and file filter
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

module.exports = upload;
