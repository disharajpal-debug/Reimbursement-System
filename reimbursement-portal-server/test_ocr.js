const fs = require("fs");
const path = require("path");
const { processReceipt } = require("./utils/ocr");

(async () => {
  try {
    const imgPath = process.argv[2] || "C:/Users/admin/Downloads/bill2.jpg";
    console.log("Using image:", imgPath);
    const buffer = fs.readFileSync(imgPath);

    const result = await processReceipt(buffer);
    console.log("\n=== OCR RESULT ===");
    console.log(JSON.stringify(result, null, 2));

    if (result && result.data && result.data.rawText) {
      console.log("\n=== RAW OCR TEXT (first 1000 chars) ===\n");
      console.log(result.data.rawText.slice(0, 1000));
    }
  } catch (err) {
    console.error("Test script error:", err);
    process.exit(1);
  }
})();
