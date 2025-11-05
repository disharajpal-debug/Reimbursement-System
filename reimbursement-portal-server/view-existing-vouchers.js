// View existing vouchers from the database
const db = require("./models");

async function viewExistingVouchers() {
  try {
    console.log("📊 Fetching existing vouchers from database...\n");

    // Get all vouchers with user information
    const vouchers = await db.Voucher.findAll({
      include: [
        {
          model: db.User,
          as: "employee",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: db.User,
          as: "approver",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (vouchers.length === 0) {
      console.log("❌ No vouchers found in the database.");
      console.log(
        "💡 To create vouchers, users need to submit forms through the application."
      );
      return;
    }

    console.log(`✅ Found ${vouchers.length} voucher(s) in the database:\n`);

    // Display vouchers in a nice format
    vouchers.forEach((voucher, index) => {
      console.log(`📋 Voucher #${index + 1}`);
      console.log(`   Voucher No: ${voucher.voucherNo}`);
      console.log(`   Employee: ${voucher.employeeName}`);
      console.log(`   Email: ${voucher.employee?.email || "N/A"}`);
      console.log(`   Role: ${voucher.employee?.role || "N/A"}`);
      console.log(
        `   Form Type: ${voucher.formType.replace("_", " ").toUpperCase()}`
      );
      console.log(`   Amount: ₹${voucher.totalAmount}`);
      console.log(`   Project: ${voucher.projectName || "N/A"}`);
      console.log(`   Status: ${voucher.status.toUpperCase()}`);
      console.log(
        `   Created: ${new Date(voucher.createdAt).toLocaleString()}`
      );

      if (voucher.approvedBy) {
        console.log(`   Approved By: ${voucher.approver?.name || "N/A"}`);
        console.log(
          `   Approved At: ${new Date(voucher.approvedAt).toLocaleString()}`
        );
      }

      if (voucher.rejectedBy) {
        console.log(`   Rejected By: ${voucher.rejectedBy}`);
        console.log(
          `   Rejected At: ${new Date(voucher.rejectedAt).toLocaleString()}`
        );
        console.log(`   Rejection Reason: ${voucher.rejectionReason || "N/A"}`);
      }

      if (voucher.transactionDate) {
        console.log(
          `   Transaction Date: ${new Date(
            voucher.transactionDate
          ).toLocaleString()}`
        );
      }

      console.log(
        `   Proofs: ${voucher.proofs ? voucher.proofs.length : 0} document(s)`
      );
      console.log("   " + "─".repeat(50));
    });

    // Summary by status
    const statusCounts = vouchers.reduce((acc, voucher) => {
      acc[voucher.status] = (acc[voucher.status] || 0) + 1;
      return acc;
    }, {});

    console.log("\n📈 Summary by Status:");
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status.toUpperCase()}: ${count} voucher(s)`);
    });

    // Summary by form type
    const formTypeCounts = vouchers.reduce((acc, voucher) => {
      acc[voucher.formType] = (acc[voucher.formType] || 0) + 1;
      return acc;
    }, {});

    console.log("\n📋 Summary by Form Type:");
    Object.entries(formTypeCounts).forEach(([formType, count]) => {
      console.log(
        `   ${formType.replace("_", " ").toUpperCase()}: ${count} voucher(s)`
      );
    });

    console.log("\n🔑 To view these vouchers in the admin panel:");
    console.log(
      "1. Start the server: cd reimbursement-portal-server && npm start"
    );
    console.log(
      "2. Start the client: cd reimbursement-portal-client && npm start"
    );
    console.log("3. Login as admin: admin@test.com / admin123");
    console.log("4. Navigate to Voucher Approval page");
  } catch (error) {
    console.error("❌ Error fetching vouchers:", error);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

viewExistingVouchers();
