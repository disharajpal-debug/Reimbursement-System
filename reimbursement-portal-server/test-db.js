const db = require("./models");

async function testDatabase() {
  try {
    console.log("Testing database connection...");
    
    // Test connection
    await db.sequelize.authenticate();
    console.log("✅ Database connection successful");
    
    // Test table creation
    await db.sequelize.sync({ force: false, alter: true });
    console.log("✅ Tables synced successfully");
    
    // Test creating a simple cash payment
    const testPayment = await db.CashPayment.create({
      employeeName: "Test User",
      date: "01-Jan-2024",
      voucherNo: "TEST-001",
      paymentDate: "01-Jan-2024",
      projectName: "Test Project",
      ecLocation: "Pune",
      bills: [],
      totalExpenses: 100.00,
      advancePayment: 0,
      balanceReimbursement: 100.00,
      amtInWords: "One Hundred Rupees Only",
      preparedBy: "Test",
      receiverSign: "Test",
      accountsSign: "Test",
      authorizedSignatory: "Test",
      userId: 1,
      status: "pending"
    });
    
    console.log("✅ Test cash payment created:", testPayment.id);
    
    // Clean up test data
    await testPayment.destroy();
    console.log("✅ Test data cleaned up");
    
    console.log("🎉 Database test completed successfully!");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Database test failed:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  }
}

testDatabase();
