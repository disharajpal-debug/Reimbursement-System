// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

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
app.use("/uploadFiles", express.static("uploadFiles"));
app.use("/api/upload", require("./routes/upload"));

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

    // Sync models without ALTER to avoid DB crash from repeated index changes
    await db.sequelize.sync({ force: false, alter: false });
    console.log("✅ Models synced with database");

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
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
          console.log(`🚀 Server running on http://localhost:${PORT}`);
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
