// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// ============== Global error handlers ==============
// Catch uncaught exceptions and unhandled promise rejections so the
// server doesn't silently exit without logging useful diagnostics.
process.on("uncaughtException", (err) => {
  console.error("🔥 Uncaught Exception:", err && err.stack ? err.stack : err);
  // NOTE: We intentionally do not call process.exit here so developers can
  // inspect the running process during debugging. In production you may
  // prefer to exit and let a process manager (pm2/systemd) restart the app.
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🔥 Unhandled Rejection at:", promise, "reason:", reason);
  // As above, avoid exiting automatically to preserve state for debugging.
});

// Graceful shutdown handlers for SIGINT / SIGTERM
const gracefulShutdown = async (signal) => {
  try {
    console.log(`🛑 Received ${signal}. Closing server gracefully...`);
    if (db && db.sequelize) {
      await db.sequelize.close();
      console.log("✅ Sequelize connection closed");
    }
    process.exit(0);
  } catch (err) {
    console.error("Error during graceful shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Prevent memory leak warnings (optional tweak)
require("events").EventEmitter.defaultMaxListeners = 20;

// Sequelize models
const db = require("./models/index");

// ================== Import Routes ==================
const authRoutes = require("./routes/authRoutes");
const reimbursementRoutes = require("./routes/reimbursementRoutes");
const adminRoutes = require("./routes/admin");
const usersRoutes = require("./routes/users");
const cashPaymentRoutes = require("./routes/cashPayment");
const travelRequestRoutes = require("./routes/travelRequest");
const vendorPaymentsRoutes = require("./routes/vendorpayments");
const leaveRequestsRoutes = require("./routes/leaverequests");
const localTravelRoutes = require("./routes/localTravelRoutes");
const outstationTravelRoutes = require("./routes/outstationTravelRoutes");
const trainingRequestsRoutes = require("./routes/trainingrequests");
const employeeRoutes = require("./routes/employee");

const uploadRoutes = require("./routes/upload");
const voucherRoutes = require("./routes/vouchers");
const ocrRoutes = require("./routes/ocr");

// (Removed temporary debug route-module logs)

// ================== Initialize App ==================
const app = express();

// ================== Middlewares ==================
app.use(cors());
app.use(express.json({ limit: "1000mb" }));
app.use(express.urlencoded({ extended: true, limit: "1000mb" }));

// ================== Static File Serving ==================
app.use("/uploadFiles", express.static(path.join(__dirname, "uploadFiles")));

// ================== API Routes ==================
app.use("/api/auth", authRoutes);
app.use("/api/reimbursements", reimbursementRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/cash-payment", cashPaymentRoutes);
app.use("/api/travel-request", travelRequestRoutes);
app.use("/api/vendor-payments", vendorPaymentsRoutes);
// Aliases for backward compatibility with clients using different paths
app.use("/api/vendor-payment", vendorPaymentsRoutes);
app.use("/api/vendorpayments", vendorPaymentsRoutes);
app.use("/api/leave-requests", leaveRequestsRoutes);
app.use("/api/local-travel", localTravelRoutes);
app.use("/api/outstation-travel", outstationTravelRoutes);
app.use("/api/training-requests", trainingRequestsRoutes);
app.use("/api/employee", employeeRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/uploadFiles", express.static("uploadFiles"));
app.use("/api/upload", require("./routes/upload"));

// (Temporary direct test endpoint removed)

// ================== Health Check ==================
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    service: "Reimbursement System API",
    timestamp: new Date().toISOString(),
  });
});

// ================== Start Server ==================
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    // Authenticate DB
    await db.sequelize.authenticate();
    console.log("✅ Database connection established");

    // Sync models. In development/tests we may want a fresh DB, but avoid
    // force-syncing by default so restarting the server doesn't wipe users/tables
    const forceSync =
      process.env.FORCE_SYNC === "true" || process.env.NODE_ENV === "test";
    await db.sequelize.sync({ force: forceSync });
    console.log("✅ Models synced with database (force=", forceSync, ")");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      // Log registered routes for debugging (guard if _router isn't ready)
      setTimeout(() => {
        try {
          // Only attempt to list routes when the router stack is present.
          if (app._router && Array.isArray(app._router.stack)) {
            const routes = app._router.stack
              .filter((r) => r.route)
              .map((r) => ({ path: r.route.path, methods: r.route.methods }));
            console.log("Registered routes:", JSON.stringify(routes, null, 2));
          }
        } catch (err) {
          console.error("Failed to list routes:", err.message);
        }
      }, 200);
    });
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    console.error("Full error:", err);

    // Try to create database if it doesn't exist
    if (err.message.includes("Unknown database")) {
      console.log("🔄 Attempting to create database...");
      try {
        const { Sequelize } = require("sequelize");
        const tempSequelize = new Sequelize("", "root", "root", {
          host: "localhost",
          dialect: "mysql",
        });
        await tempSequelize.query(
          "CREATE DATABASE IF NOT EXISTS reimbursement_db;"
        );
        await tempSequelize.close();
        console.log("✅ Database created successfully");

        // Retry connection
        await db.sequelize.authenticate();
        await db.sequelize.sync({ force: false, alter: true });
        console.log("✅ Database connection established after creation");

        app.listen(PORT, () => {
          console.log(`🚀 Server running on port ${PORT}`);
          // Log registered routes for debugging
          setTimeout(() => {
            try {
              if (app._router && Array.isArray(app._router.stack)) {
                const routes = app._router.stack
                  .filter((r) => r.route)
                  .map((r) => ({
                    path: r.route.path,
                    methods: r.route.methods,
                  }));
                console.log(
                  "Registered routes:",
                  JSON.stringify(routes, null, 2)
                );
              }
            } catch (err) {
              console.error("Failed to list routes:", err.message);
            }
          }, 200);
        });
      } catch (createErr) {
        console.error("❌ Failed to create database:", createErr.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
})();

module.exports = app;
