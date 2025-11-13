// scripts/seed-test-data.js
const bcrypt = require("bcryptjs");
const db = require("../models");

async function seedTestData() {
  try {
    console.log("🔄 Resetting database (dropping and recreating tables)");
    await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    await db.sequelize.sync({ force: true });
    await db.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("✅ Database reset complete");

    // Create admin
    const admin = await db.User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
    });

    // Create manager (use manager@c4i4.org for dashboard login)
    const manager = await db.User.create({
      name: "Manager User",
      email: "manager@c4i4.org",
      password: await bcrypt.hash("manager123", 10),
      role: "manager",
    });

    // Create employees under the manager
    const employee1 = await db.User.create({
      name: "Employee One",
      email: "employee1@example.com",
      password: await bcrypt.hash("employee123", 10),
      role: "employee",
      managerId: manager.id,
    });

    const employee2 = await db.User.create({
      name: "Employee Two",
      email: "employee2@example.com",
      password: await bcrypt.hash("employee123", 10),
      role: "employee",
      managerId: manager.id,
    });

    // Create some test vouchers
    await db.Voucher.create({
      voucherNo: "VCH202501001",
      employeeName: employee1.name,
      employeeId: employee1.id,
      managerId: manager.id,
      formType: "cash_payment",
      formData: {
        description: "Office supplies",
        bills: [{ billNo: "BILL001", amount: 1500 }],
      },
      totalAmount: 1500,
      projectName: "Office Operations",
      status: "pending",
      createdBy: employee1.id,
    });

    await db.Voucher.create({
      voucherNo: "VCH202501002",
      employeeName: employee2.name,
      employeeId: employee2.id,
      managerId: manager.id,
      formType: "local_travel",
      formData: {
        description: "Client meeting travel",
        bills: [{ billNo: "BILL002", amount: 800 }],
      },
      totalAmount: 800,
      projectName: "Client Relations",
      status: "pending",
      createdBy: employee2.id,
    });

    // Add test cash payment (all required fields)
    await db.CashPayment.create({
      userId: employee1.id,
      employeeName: employee1.name,
      amount: 1200,
      description: "Petty cash for supplies",
      status: "pending",
      proofs: ["/uploadFiles/CashPaymentForm/test-proof1.jpg"],
      date: new Date().toISOString().slice(0, 10),
      voucherNo: "CP-1001",
      paymentDate: new Date().toISOString().slice(0, 10),
    });

    // Add test vendor payment (all required fields)
    await db.VendorPayment.create({
      userId: employee2.id,
      employeeName: employee2.name,
      vendorName: "ABC Stationery",
      date: new Date().toISOString().slice(0, 10),
      voucherNo: "VP-1001",
      paymentDate: new Date().toISOString().slice(0, 10),
      ecLocation: "Pune",
      bills: [{ billNo: "VPB001", billDate: "2025-11-01", amount: 2200 }],
      totalExpenses: 2200,
      amtInWords: "Two Thousand Two Hundred Only",
      preparedBy: employee2.name,
      proofs: ["/uploadFiles/VendorPaymentForm/test-proof2.jpg"],
      status: "pending",
      manager_status: "pending",
      admin_status: "pending",
      manager_reason: null,
      admin_reason: null,
    });

    // Add test local travel (all required fields)
    await db.LocalTravel.create({
      userId: employee1.id,
      employeeName: employee1.name,
      date: new Date().toISOString().slice(0, 10),
      voucherNo: "LT-1001",
      paymentDate: new Date().toISOString().slice(0, 10),
      projectName: "Field Visit",
      description: "Travel to client site",
      bills: [{ billNo: "LTB001", amount: 500 }],
      totalExpenses: 500,
      status: "pending",
      proofs: ["/uploadFiles/LocalTravelForm/test-proof3.jpg"],
    });

    // Add test outstation travel (all required fields)
    await db.OutstationTravel.create({
      userId: employee2.id,
      employeeName: employee2.name,
      dateFrom: "2025-11-01",
      dateTo: "2025-11-03",
      voucherNo: "OT-1001",
      paymentDate: new Date().toISOString().slice(0, 10),
      projectName: "Conference",
      travelDescription: "Attending tech conference",
      bills: [{ billNo: "OTB001", amount: 3500 }],
      totalExpenses: 3500,
      status: "pending",
      proofs: ["/uploadFiles/OutstationTravelForm/test-proof4.jpg"],
    });

    // Add test reimbursement
    await db.Reimbursement.create({
      userId: employee1.id,
      type: "Medical",
      amount: 1800,
      gst: 0,
      description: "Medical reimbursement for checkup",
      billImage: "/uploadFiles/ReimbursementForm/test-proof5.jpg",
      status: "pending",
    });

    console.log("✅ Test data seeded successfully");
    console.log("Admin credentials:", {
      email: "admin@example.com",
      password: "admin123",
    });
    console.log("Manager credentials:", {
      email: "manager@c4i4.org",
      password: "manager123",
    });
    console.log("Employee credentials:", {
      email1: "employee1@example.com",
      email2: "employee2@example.com",
      password: "employee123",
    });
  } catch (error) {
    console.error("Error seeding test data:", error);
  } finally {
    try {
      await db.sequelize.close();
    } catch (e) {
      // ignore
    }
    process.exit();
  }
}

seedTestData();
