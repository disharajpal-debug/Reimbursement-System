#!/usr/bin/env node

/**
 * Employee Dashboard - Complete System Verification
 * This script checks all components are working correctly
 */

const http = require("http");
const https = require("https");
const { URL } = require("url");
const fs = require("fs");
const path = require("path");

// ============================================================================
// CONFIGURATION
// ============================================================================

const BACKEND_URL = "http://localhost:5000";
const FRONTEND_URL = "http://localhost:3000";
const UPLOAD_DIR = path.join(
  __dirname,
  "reimbursement-portal-server",
  "uploadFiles"
);

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[36m",
  bold: "\x1b[1m",
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  section: (msg) =>
    console.log(
      `\n${colors.bold}${colors.blue}═══ ${msg} ═══${colors.reset}\n`
    ),
  title: (msg) =>
    console.log(
      `\n${colors.bold}${
        colors.blue
      }╔════════════════════════════════════════╗\n║ ${msg.padEnd(
        37
      )} ║\n╚════════════════════════════════════════╝${colors.reset}\n`
    ),
};

// ============================================================================
// HTTP REQUEST HELPER
// ============================================================================

function makeRequest(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlStr);
    const client = urlStr.startsWith("https") ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || "GET",
      timeout: 5000,
      ...(options.headers && { headers: options.headers }),
    };

    const req = client.request(requestOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

async function checkBackendHealth() {
  log.section("1. Backend Health Check");

  try {
    const res = await makeRequest(BACKEND_URL);
    if (res.status === 200 && res.data?.status === "OK") {
      log.success(`Backend is running on port 5000`);
      log.info(`Service: ${res.data.service}`);
      log.info(`Timestamp: ${res.data.timestamp}`);
      return true;
    } else {
      log.error(`Backend returned unexpected response: ${res.status}`);
      return false;
    }
  } catch (err) {
    log.error(`Backend not responding: ${err.message}`);
    log.warn(`Make sure to run: node server.js`);
    return false;
  }
}

async function checkOCREndpoint() {
  log.section("2. OCR Endpoint Check");

  try {
    const res = await makeRequest(`${BACKEND_URL}/api/ocr/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { filePath: "/invalid/path.jpg" },
    });

    if (res.status === 400) {
      log.success(`OCR endpoint is responding correctly`);
      log.info(`Error handling works: "${res.data.error}"`);
      return true;
    } else {
      log.warn(`OCR returned unexpected status: ${res.status}`);
      return false;
    }
  } catch (err) {
    log.error(`OCR endpoint not accessible: ${err.message}`);
    return false;
  }
}

async function checkUploadEndpoints() {
  log.section("3. Upload Endpoints Check");

  const endpoints = [
    { name: "Cash Payment", path: "/api/uploads/cashPayments" },
    { name: "Vendor Payment", path: "/api/uploads/vendorPayments" },
    { name: "Local Travel", path: "/api/uploads/localTravel" },
    { name: "Outstation Travel", path: "/api/uploads/outstationTravel" },
  ];

  let allOk = true;

  for (const endpoint of endpoints) {
    try {
      const res = await makeRequest(`${BACKEND_URL}${endpoint.path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {},
      });

      // Both 400 (bad request) and 415 (unsupported media type) indicate endpoint exists
      if (res.status === 400 || res.status === 415) {
        log.success(`${endpoint.name} upload endpoint reachable`);
      } else {
        log.warn(`${endpoint.name}: Unexpected response (${res.status})`);
      }
    } catch (err) {
      log.error(`${endpoint.name}: ${err.message}`);
      allOk = false;
    }
  }

  return allOk;
}

function checkUploadDirectories() {
  log.section("4. Upload Directories Check");

  const required = [
    "CashPaymentForm",
    "VendorPaymentForm",
    "LocalTravelForm",
    "OutstationTravelForm",
  ];

  let allExist = true;

  for (const dir of required) {
    const dirPath = path.join(UPLOAD_DIR, dir);
    if (fs.existsSync(dirPath)) {
      const fileCount = fs.readdirSync(dirPath).length;
      log.success(`${dir}: ${fileCount} files`);
    } else {
      log.warn(`${dir}: Directory missing (will be created on first upload)`);
    }
  }

  return allExist;
}

async function checkFrontendBuild() {
  log.section("5. Frontend Build Check");

  const buildPath = path.join(
    __dirname,
    "reimbursement-portal-client",
    "build",
    "index.html"
  );

  if (fs.existsSync(buildPath)) {
    log.success(`Frontend production build exists`);
    const stats = fs.statSync(buildPath);
    log.info(`Build size: ${(stats.size / 1024).toFixed(2)} KB`);
    return true;
  } else {
    log.warn(`Frontend build not found at ${buildPath}`);
    log.info(`Run: npm run build (in reimbursement-portal-client)`);
    return false;
  }
}

function checkDatabaseModels() {
  log.section("6. Database Models Check");

  const modelsPath = path.join(
    __dirname,
    "reimbursement-portal-server",
    "models"
  );
  const required = [
    "CashPayment.js",
    "VendorPayment.js",
    "LocalTravel.js",
    "OutstationTravel.js",
  ];

  let allExist = true;

  for (const model of required) {
    const modelPath = path.join(modelsPath, model);
    if (fs.existsSync(modelPath)) {
      log.success(`${model}: Available`);
    } else {
      log.error(`${model}: Missing`);
      allExist = false;
    }
  }

  return allExist;
}

function checkOCRUtils() {
  log.section("7. OCR Utilities Check");

  const ocrPath = path.join(
    __dirname,
    "reimbursement-portal-server",
    "utils",
    "ocr.js"
  );

  if (fs.existsSync(ocrPath)) {
    const content = fs.readFileSync(ocrPath, "utf8");

    const checks = [
      { pattern: /tesseract/i, name: "Tesseract OCR" },
      { pattern: /regex|parseWithRegex/i, name: "Regex fallback" },
      {
        pattern: /extractBillData|processReceipt/i,
        name: "Extraction functions",
      },
    ];

    let allFound = true;
    for (const check of checks) {
      if (check.pattern.test(content)) {
        log.success(`${check.name}: Implemented`);
      } else {
        log.error(`${check.name}: Not found`);
        allFound = false;
      }
    }

    return allFound;
  } else {
    log.error(`OCR utilities not found at ${ocrPath}`);
    return false;
  }
}

function checkFormComponents() {
  log.section("8. Form Components Check");

  const formsPath = path.join(
    __dirname,
    "reimbursement-portal-client",
    "src",
    "shared",
    "forms"
  );
  const required = [
    "CashPaymentForm.js",
    "VendorPaymentForm.js",
    "LocalTravelForm.js",
    "OutstationTravelForm.js",
  ];

  let allExist = true;

  for (const form of required) {
    const formPath = path.join(formsPath, form);
    if (fs.existsSync(formPath)) {
      log.success(`${form}: Available`);
    } else {
      log.error(`${form}: Missing`);
      allExist = false;
    }
  }

  return allExist;
}

function checkOCRUploadComponent() {
  log.section("9. OCR Upload Component Check");

  const ocrPath = path.join(
    __dirname,
    "reimbursement-portal-client",
    "src",
    "components",
    "OCRUpload.js"
  );

  if (fs.existsSync(ocrPath)) {
    const content = fs.readFileSync(ocrPath, "utf8");

    if (
      content.includes("processOCRUpload") &&
      content.includes("onOCRComplete")
    ) {
      log.success(`OCRUpload component: Properly configured`);
      return true;
    } else {
      log.warn(`OCRUpload component: Missing expected functions`);
      return false;
    }
  } else {
    log.error(`OCRUpload component not found at ${ocrPath}`);
    return false;
  }
}

// ============================================================================
// MAIN VERIFICATION
// ============================================================================

async function runFullVerification() {
  console.clear();
  log.title("EMPLOYEE DASHBOARD VERIFICATION");

  const results = [];

  // Run all checks
  results.push({ name: "Backend Health", result: await checkBackendHealth() });
  results.push({ name: "OCR Endpoint", result: await checkOCREndpoint() });
  results.push({
    name: "Upload Endpoints",
    result: await checkUploadEndpoints(),
  });
  results.push({
    name: "Upload Directories",
    result: checkUploadDirectories(),
  });
  results.push({ name: "Frontend Build", result: checkFrontendBuild() });
  results.push({ name: "Database Models", result: checkDatabaseModels() });
  results.push({ name: "OCR Utilities", result: checkOCRUtils() });
  results.push({ name: "Form Components", result: checkFormComponents() });
  results.push({
    name: "OCR Upload Component",
    result: checkOCRUploadComponent(),
  });

  // Summary
  log.section("SUMMARY");

  const passed = results.filter((r) => r.result).length;
  const total = results.length;

  console.log(`Total: ${passed}/${total} checks passed\n`);

  for (const result of results) {
    const status = result.result ? "✅" : "❌";
    console.log(`${status} ${result.name}`);
  }

  console.log("\n");

  if (passed === total) {
    log.success(`All systems operational! Ready to use.`);
    log.info(`Start the system with: START_SERVICES.bat`);
    log.info(`Then open: http://localhost:3000`);
  } else {
    log.warn(`${total - passed} issue(s) found. See details above.`);
  }

  console.log("\n");
}

// Run verification
runFullVerification().catch((err) => {
  log.error(`Verification error: ${err.message}`);
  process.exit(1);
});
