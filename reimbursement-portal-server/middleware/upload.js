const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create folder if not exists
const folder = path.join(__dirname, "../uploads/cashPayments");
if (!fs.existsSync(folder)) {
  fs.mkdirSync(folder, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

module.exports = upload;
