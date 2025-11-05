// utils/ocr.js
// Minimal OCR-like placeholder — keep current Tesseract integration if you want to enable it.
const fs = require("fs");

// Simple extraction helper (very basic heuristics). The real project used Tesseract; keep this simple as fallback.
const extractBillData = async (imagePathOrBuffer) => {
  // If using tesseract, integrate here. For now, return empty/default values.
  return { amount: 0, gst: 0, description: "" };
};

module.exports = { extractBillData };
