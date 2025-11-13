const express = require("express");
const router = express.Router();
const { processReceipt } = require("../utils/ocr");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Configure multer for memory storage (still accept direct file uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// OCR endpoint
// Accepts either a multipart upload (field 'image') OR a JSON body with `filePath`
router.post("/parse", upload.single("image"), async (req, res) => {
  console.log("OCR parse request received");
  // DEBUG: dump headers/body for troubleshooting
  console.log("DEBUG headers:", { ...req.headers });
  console.log("DEBUG body keys:", Object.keys(req.body || {}));
  try {
    let buffer = null;
    let proofPath = null;

    if (req.file && req.file.buffer) {
      // direct upload
      buffer = req.file.buffer;
      proofPath = null; // not yet saved via upload API
      console.log(
        "Received image via multipart upload:",
        req.file.originalname
      );
    } else if (req.body && req.body.filePath) {
      // filePath provided (server-side saved file) - read it
      const safePath = String(req.body.filePath).replace(/^\/+/, "");
      const abs = path.join(__dirname, "..", safePath);
      if (!fs.existsSync(abs)) {
        console.log("Requested filePath not found on server:", abs);
        return res
          .status(400)
          .json({
            success: false,
            error: "Provided filePath not found on server",
          });
      }
      buffer = fs.readFileSync(abs);
      proofPath = req.body.filePath; // keep the original path for client
      console.log("Loaded image from server path for OCR:", abs);
    } else {
      console.log("No file provided in request");
      return res
        .status(400)
        .json({ success: false, error: "No image file provided" });
    }

    // Process the receipt
    const result = await processReceipt(buffer);
    console.log(
      "OCR processing result:",
      result.success ? "success" : "failed"
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Validate extracted data
    if (!result.data?.extracted) {
      return res
        .status(422)
        .json({ success: false, error: "Failed to extract data from image" });
    }

    // Attach proofPath (if any) so client can link to saved proof
    result.data.proofPath = proofPath || null;

    res.json(result);
  } catch (error) {
    console.error("OCR route error:", error);
    res
      .status(500)
      .json({
        success: false,
        error: error.message || "Internal server error during OCR processing",
      });
  }
});

module.exports = router;
