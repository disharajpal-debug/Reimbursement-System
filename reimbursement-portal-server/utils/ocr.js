const sharp = require("sharp");
const Tesseract = require("tesseract.js");
const http = require("http");

console.log("✅ OCR System: Using FREE Ollama (no API costs ever!)");
console.log("💰 Cost: $0/month forever - no OpenAI dependency");

// ============================================================================
// STEP 1: IMAGE PREPROCESSING & OCR - Extract raw text from bill image
// ============================================================================
async function preprocessImage(imageBuffer) {
  try {
    return await sharp(imageBuffer).grayscale().sharpen().toBuffer();
  } catch (err) {
    console.error("❌ Image preprocessing error:", err.message);
    throw err;
  }
}

async function extractTextFromImage(imageBuffer) {
  try {
    console.log("📸 Step 1: Extracting text from image using Tesseract...");
    const preprocessedImage = await preprocessImage(imageBuffer);
    const {
      data: { text },
    } = await Tesseract.recognize(preprocessedImage, "eng");

    if (!text || text.trim().length === 0) {
      throw new Error("No text extracted from image");
    }

    console.log(`✅ Step 1: Extracted ${text.length} characters from image`);
    return text;
  } catch (err) {
    console.error("❌ Step 1 failed - Text extraction error:", err.message);
    throw err;
  }
}

// ============================================================================
// STEP 2: INTELLIGENT DATA EXTRACTION - Parse raw text to extract structured data
// ============================================================================

// Use Ollama to intelligently parse the extracted text
async function parseWithOllama(rawText) {
  console.log(
    "🤖 Step 2a: Sending raw text to Ollama for intelligent parsing..."
  );

  const prompt = `You are an expert bill reader. Extract data from this bill text and return ONLY a valid JSON object with these fields:
{
  "vendor": "business name",
  "billNumber": "invoice/bill/receipt number",
  "date": "transaction date in any format",
  "amount": "total amount as number",
  "items": [{"desc": "item description", "price": number}],
  "gst": "tax id if present",
  "address": "address if present"
}

Rules:
- vendor: company/store name (usually top of bill)
- billNumber: find "Invoice No", "Bill No", "Receipt No", "Ref No"  
- date: find any date (any format is OK)
- amount: FINAL total amount due (not subtotal)
- items: list of items if visible, else empty []
- gst: GST number if visible
- address: address if visible

Bill text:
${rawText}

Return ONLY JSON, nothing else.`;

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      model: "mistral",
      prompt: prompt,
      stream: false,
      temperature: 0.3,
    });

    const options = {
      hostname: "localhost",
      port: 11434,
      path: "/api/generate",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 45000,
    };

    const req = http.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseData);
          const responseText = parsed.response || "";

          // Extract JSON from response
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.warn(
              "⚠️  No JSON in Ollama response, will use regex fallback"
            );
            resolve(null);
            return;
          }

          const extracted = JSON.parse(jsonMatch[0]);
          console.log("✅ Step 2a: Ollama parsed successfully");
          resolve(extracted);
        } catch (error) {
          console.warn("⚠️  Ollama parsing failed:", error.message);
          resolve(null);
        }
      });
    });

    req.on("error", (error) => {
      console.warn("⚠️  Ollama connection failed:", error.message);
      resolve(null);
    });

    req.on("timeout", () => {
      console.warn("⚠️  Ollama request timeout");
      req.destroy();
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

// Regex-based extraction as fallback
function parseWithRegex(rawText) {
  console.log("📊 Step 2b: Using regex patterns to extract data...");

  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Extract vendor (usually first line)
  const vendor = lines[0] || null;

  // Extract bill number
  let billNumber = null;
  // Match patterns like "Bill No", "Bill No.", "Bill No.:", "Invoice No:", "Ref No" etc.
  const billMatch = rawText.match(
    /(?:bill\s*no\.?|invoice\s*no\.?|receipt\s*no\.?|ref\s*no\.?)(?:[:\.\s]*)\s*([A-Za-z0-9\-\\/]+)/i
  );
  if (billMatch) billNumber = billMatch[1];

  // Extract date
  let date = null;
  const dateMatch = rawText.match(
    /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/
  );
  if (dateMatch) date = dateMatch[1];

  // Extract amount
  let amount = null;
  // Prefer Grand Total if present
  const grandMatch = rawText.match(/grand\s*total[^\d]*([\d,]+\.?\d*)/i);
  if (grandMatch) {
    amount = parseFloat(grandMatch[1].replace(/,/g, ""));
  } else {
    // Look bottom-up for lines containing "total" or "amount" and extract the first money value
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      if (/grand\s*total|total[:\s]|amount[:\s]|amount\s*due/i.test(l)) {
        const m = l.match(/([\d,]+\.?\d*)/);
        if (m) {
          amount = parseFloat(m[1].replace(/,/g, ""));
          break;
        }
      }
    }
    // Fallback: pick the largest numeric value found in the text
    if (amount == null) {
      const nums = Array.from(rawText.matchAll(/([\d,]+\.?\d*)/g))
        .map((m) => parseFloat(m[1].replace(/,/g, "")))
        .filter((n) => !isNaN(n));
      if (nums.length) amount = Math.max(...nums);
    }
  }

  // Extract GST using the robust extractor (strict -> label -> generic)
  let gst = extractGSTNumber(rawText);

  console.log("✅ Step 2b: Regex extraction complete");

  return {
    vendor,
    billNumber,
    date,
    amount,
    items: [],
    gst,
    address: null,
  };
}

// Main extraction function - combines Ollama and Regex
async function extractBillData(rawText) {
  // Try Ollama first
  let extracted = await parseWithOllama(rawText);

  // If Ollama fails, use Regex
  if (!extracted) {
    console.log("🔄 Ollama unavailable, falling back to regex...");
    extracted = parseWithRegex(rawText);
  }

  return extracted;
}

async function preprocessImage(imageBuffer) {
  return await sharp(imageBuffer).grayscale().sharpen().toBuffer();
}

async function performOCR(imageBuffer) {
  try {
    // Use the high-level recognize API which handles worker lifecycle.
    const {
      data: { text },
    } = await Tesseract.recognize(imageBuffer, "eng");
    return text;
  } catch (err) {
    console.error("Tesseract OCR error:", err);
    throw err;
  }
}

// ============================================================================
// Backward compatibility wrapper for old API
// ============================================================================
const processReceiptFile = async (imageBuffer) => {
  try {
    const result = await processReceipt(imageBuffer);
    if (!result.success) {
      return { amount: 0, gst: 0, description: "" };
    }

    const { extracted } = result.data;
    return {
      amount: extracted.amount || 0,
      gst: extracted.gst || "",
      description: extracted.items
        ? extracted.items
            .map((item) => item.desc || item.description || "")
            .join(", ")
        : "",
    };
  } catch (error) {
    console.error("Bill data extraction error:", error);
    return { amount: 0, gst: 0, description: "" };
  }
};

async function processReceipt(imageBuffer) {
  try {
    console.log("\n========== BILL SCANNING STARTED ==========");

    // =========================================================================
    // STEP 1: Extract raw text from image
    // =========================================================================
    console.log("� Step 1: Preprocessing image...");
    const preprocessedImage = await preprocessImage(imageBuffer);
    console.log("✅ Step 1: Image preprocessed (grayscale + sharpen)");

    console.log("👁️  Step 1: Running Tesseract OCR...");
    const rawText = await performOCR(preprocessedImage);
    console.log(`✅ Step 1: Text extracted (${rawText.length} characters)`);
    console.log(`📄 First 200 chars: ${rawText.slice(0, 200)}`);

    // =========================================================================
    // STEP 2: Parse raw text to structured data
    // =========================================================================
    console.log("\n🤖 Step 2: Parsing structured data...");
    const structuredData = await extractBillData(rawText);
    console.log("✅ Step 2: Data parsed");
    console.log("📊 Extracted fields:");
    console.log(`   - Vendor: ${structuredData.vendor}`);
    console.log(`   - Bill #: ${structuredData.billNumber}`);
    console.log(`   - Date: ${structuredData.date}`);
    console.log(`   - Amount: ${structuredData.amount}`);
    console.log(`   - GST: ${structuredData.gst}`);

    // =========================================================================
    // STEP 3: Return structured response
    // =========================================================================
    console.log("\n✅ Bill scanning complete!");
    console.log("========== BILL SCANNING FINISHED ==========\n");

    return {
      success: true,
      data: {
        rawText,
        extracted: structuredData,
      },
    };
  } catch (error) {
    console.error("❌ Receipt processing error:", error);
    return {
      success: false,
      error: error.message,
      data: { rawText: null, extracted: null },
    };
  }
}

// Basic data extraction without OpenAI
function extractBasicData(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Heuristics: vendor name is usually the first non-empty line
  const vendorName = lines.length ? lines[0] : null;

  // Try line-based extraction for invoice number and amounts
  const invoiceNumber =
    extractInvoiceNumberFromLines(lines) || extractInvoiceNumber(text);
  const billNumber = invoiceNumber; // Bill number and invoice number are typically the same
  const date = extractDateFromLines(lines) || extractDate(text);
  const totalAmount = extractTotalAmountFromLines(lines) || extractAmount(text);

  return {
    vendorName,
    invoiceNumber,
    billNumber,
    date,
    billDate: date, // Bill date is same as extracted date
    items: [],
    totalAmount,
    gstNumber: extractGSTNumber(text),
    address: null,
  };
}

function extractInvoiceNumber(text) {
  // Try explicit patterns first: "Invoice No: VALUE", "Bill No: VALUE", etc.
  let invoiceMatch = text.match(
    /(?:invoice|bill|receipt)\s*(?:no\.?|no|number|#|code)\s*[:\-]?\s*([A-Za-z0-9\-\/\_]+)/i
  );
  if (invoiceMatch && invoiceMatch[1]) return invoiceMatch[1];

  // Try "Ref No" or "Reference Number"
  invoiceMatch = text.match(
    /(?:ref(?:erence)?|bn|inv)\s*(?:no\.?|no|number|#|code)\s*[:\-]?\s*([A-Za-z0-9\-\/\_]+)/i
  );
  if (invoiceMatch && invoiceMatch[1]) return invoiceMatch[1];

  // Try generic prefixes like INV1234 or BILL-0001
  let fallback = text.match(
    /\b(?:INV|INVOICE|BILL|BN|BR|REF)[:\s\-]*([A-Za-z0-9\-\/\_]{3,})\b/i
  );
  if (fallback && fallback[1]) return fallback[1];

  // Try patterns like "#123456" or "#INV-2025-001"
  fallback = text.match(/#\s*([A-Za-z0-9\-\/\_]+)\b/);
  if (fallback && fallback[1]) return fallback[1];

  return null;
}

function extractInvoiceNumberFromLines(lines) {
  const keyPatterns = [
    /invoice\s*(?:no\.?|no|number|#)/i,
    /bill\s*(?:no\.?|no|number|#)/i,
    /receipt\s*(?:no\.?|no|number|#)/i,
    /ref(?:erence)?\s*(?:no\.?|no|number|#)/i,
    /inv[:\s\-]/i,
    /bill\s*[:\-]?\s*$/i,
    /inv[:\-]?\s*$/i,
  ];

  // First pass: look for explicit "Date:" or "Bill Date:" lines
  for (const line of lines) {
    for (const p of keyPatterns) {
      if (p.test(line)) {
        // Try extracting after colon/dash
        const m = line.match(
          /(?:invoice|bill|receipt|inv|ref|bn)[:\s\-]*([A-Za-z0-9\-\/\_]{2,})/i
        );
        if (m && m[1]) {
          let value = m[1].replace(/[:\s]/g, "").trim();
          // Remove trailing punctuation
          value = value.replace(/[.,;:\)\]]$/, "");
          if (value.length >= 2) return value;
        }
        // If label and value separated by colon
        const colon = line.split(":");
        if (colon.length > 1) {
          let value = colon.slice(1).join(":").trim().split(/\s+/)[0];
          value = value.replace(/[.,;:\)\]]$/, "");
          if (value.length >= 2) return value;
        }
      }
    }
  }

  // Second pass: look for patterns like "Bill No 12345" or "Inv:98765"
  for (const line of lines) {
    // Pattern: word boundary, number sequence (4+ digits or alphanumeric)
    const m = line.match(
      /\b(?:bill|inv|ref|bn|receipt)[\s:\-]*([A-Za-z0-9\-\/\_]{2,})/i
    );
    if (m && m[1]) {
      let value = m[1].trim();
      // Exclude date patterns (DD/MM format)
      if (!/^\d{1,2}[\/\-]\d{1,2}/.test(value)) {
        value = value.replace(/[.,;:\)\]]$/, "");
        if (value.length >= 2) return value;
      }
    }
  }

  // Third pass: aggressive pattern matching - look for all-caps alphanumeric codes
  for (const line of lines) {
    // Look for patterns like: "INV00123", "BN2025001", "BILL-0001"
    const m = line.match(
      /\b(?:[A-Z]{2,4})[:\s\-]*([0-9]{3,}[A-Z0-9\-]*|[A-Z][0-9]+)\b/
    );
    if (m && m[1]) {
      let value = m[1].trim();
      if (!/^\d{1,2}[\/\-]\d{1,2}/.test(value)) {
        return value;
      }
    }
  }

  return null;
}

function extractDate(text) {
  // Try DD/MM/YYYY or DD-MM-YYYY first (most common in India)
  let dateMatch = text.match(/\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/);
  if (dateMatch) return dateMatch[1];

  // Try YYYY-MM-DD
  dateMatch = text.match(/\b(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/);
  if (dateMatch) return dateMatch[1];

  // Try MM/DD/YYYY format
  dateMatch = text.match(/\b(\d{2}[-\/]\d{2}[-\/]\d{4})\b/);
  if (dateMatch) return dateMatch[1];

  // Match formats like 12 Dec 2023 or Dec 12, 2023
  const monthWord = text.match(
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i
  );
  if (monthWord) return monthWord[1];

  const monthWord2 = text.match(
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s*\d{4})\b/i
  );
  if (monthWord2) return monthWord2[1];

  // Match d-mmm-yy format (common in Indian receipts: 12-Jan-23)
  const shortMonth = text.match(
    /\b(\d{1,2}[-\/](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*[-\/]\d{2,4})\b/i
  );
  if (shortMonth) return shortMonth[1];

  // Try ISO week date format
  dateMatch = text.match(/\b(\d{4}-W\d{2}-\d)\b/);
  if (dateMatch) return dateMatch[1];

  // Try named month patterns: "10 November 2025", "Nov 10, 2025"
  const namedMonth = text.match(
    /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i
  );
  if (namedMonth) return namedMonth[1];

  return null;
}

function extractDateFromLines(lines) {
  // First pass: look for explicit "Date:", "Bill Date:", or "Invoice Date:" lines
  const dateKeywords = [
    /bill\s*date\s*[:\-]/i,
    /invoice\s*date\s*[:\-]/i,
    /transaction\s*date\s*[:\-]/i,
    /date\s*[:\-]/i,
    /dated\s*[:\-]/i,
  ];

  for (const line of lines) {
    for (const keyword of dateKeywords) {
      if (keyword.test(line)) {
        const afterColon = line.split(/[:\-]/).slice(1).join(":").trim();
        const d = extractDate(afterColon);
        if (d) return d;
      }
    }
  }

  // Second pass: scan all lines for date patterns (common in receipts)
  for (const line of lines) {
    // Skip lines that are purely numeric (could be amounts)
    if (!/^[\d.,\s]+$/.test(line)) {
      const d = extractDate(line);
      if (d) return d;
    }
  }

  return null;
}

function extractAmount(text) {
  const amountMatch = text.match(
    /(?:total|amount|payable|due)[^\d]*?([\d,]+\.?\d*)/i
  );
  if (amountMatch) return parseFloat(amountMatch[1].replace(/,/g, ""));

  // Generic number fallback: return largest numeric-looking value
  const nums = Array.from(text.matchAll(/([\d,]+\.?\d*)/g))
    .map((m) => parseFloat(m[1].replace(/,/g, "")))
    .filter((n) => !isNaN(n));
  if (nums.length) return Math.max(...nums);
  return null;
}

function extractTotalAmountFromLines(lines) {
  // look for explicit total/grand total lines first
  const totalKeywords = [
    /grand\s*total/i,
    /total\s*amount/i,
    /net\s*total/i,
    /balance\s*due/i,
    /amount\s*due/i,
    /amount\s*payable/i,
    /invoice\s*total/i,
    /total[:\s]/i,
  ];
  for (const line of lines.slice().reverse()) {
    // search bottom-up where totals usually are
    for (const k of totalKeywords) {
      if (k.test(line)) {
        const n = parseCurrency(line);
        if (n != null) return n;
        // try the next token
        const tok = line.split(/[:\s]\s*/).pop();
        const parsed = parseCurrency(tok);
        if (parsed != null) return parsed;
      }
    }
  }

  // If no explicit keyword lines found, collect all currency-like numbers and pick the largest
  const allNums = [];
  for (const line of lines) {
    const n = parseCurrency(line);
    if (n != null) allNums.push(n);
    else {
      const matches = line.match(/[\d,]+\.?\d*/g);
      if (matches)
        matches.forEach((m) => {
          const v = parseFloat(m.replace(/,/g, ""));
          if (!isNaN(v)) allNums.push(v);
        });
    }
  }
  if (allNums.length) return Math.max(...allNums);
  return null;
}

function parseCurrency(str) {
  if (!str) return null;
  // Remove common currency symbols and words
  const cleaned = str
    .replace(/[,\s]|₹|Rs\.?|INR|USD|\$/gi, "")
    .match(/\d+\.?\d*/);
  if (!cleaned) return null;
  const val = parseFloat(cleaned[0]);
  return isNaN(val) ? null : val;
}

function extractGSTNumber(text) {
  // Strict GSTIN (standard 15-char pattern)
  let gstMatch = text.match(
    /[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}/i
  );
  if (gstMatch) return gstMatch[0].toUpperCase();

  // Looser fallback: look for label 'GSTIN' or 'GST' followed by a contiguous alphanumeric token (~15 chars)
  const labelMatch = text.match(
    /(?:GSTIN|GST)\s*[:\-]?\s*([A-Z0-9\-]{10,20})/i
  );
  if (labelMatch && labelMatch[1]) {
    const cleaned = labelMatch[1].replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (cleaned.length >= 14 && cleaned.length <= 16) return cleaned;
  }

  // Generic fallback: any 15-char alphanumeric sequence that includes digits (GSTIN must include digits)
  const generic = text.match(/\b([A-Z0-9]{14,16})\b/i);
  if (generic) {
    const candidate = generic[1].toUpperCase();
    const digitCount = (candidate.match(/\d/g) || []).length;
    if (digitCount >= 2 && candidate.length >= 14 && candidate.length <= 16)
      return candidate;
  }

  return null;
}

// ============================================================================
// MODULE EXPORTS - Complete OCR Processing Pipeline
// ============================================================================
// processReceipt(imageBuffer)
//   → Step 1: Image preprocessing + Tesseract OCR → raw text
//   → Step 2: Ollama AI parsing OR Regex fallback → structured data
//   → Step 3: Return { success, rawText, extracted: { vendor, billNumber, date, amount, ... } }
//
// extractBillData(rawText)
//   → Parses extracted text using Ollama first, falls back to Regex
//   → Returns structured bill data
// ============================================================================

module.exports = {
  processReceipt,
  extractBillData,
};
