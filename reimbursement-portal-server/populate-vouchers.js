// Populate database with sample vouchers from different users
const db = require('./models');
const bcrypt = require('bcryptjs');

async function populateVouchers() {
  try {
    console.log('Creating sample users and vouchers...');
    
    // Create sample users if they don't exist
    const users = [
      { name: 'John Doe', email: 'john@company.com', role: 'employee' },
      { name: 'Jane Smith', email: 'jane@company.com', role: 'employee' },
      { name: 'Mike Johnson', email: 'mike@company.com', role: 'employee' },
      { name: 'Sarah Wilson', email: 'sarah@company.com', role: 'employee' },
      { name: 'David Brown', email: 'david@company.com', role: 'employee' }
    ];
    
    const createdUsers = [];
    for (const userData of users) {
      let user = await db.User.findOne({ where: { email: userData.email } });
      if (!user) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        user = await db.User.create({
          ...userData,
          password: hashedPassword
        });
        console.log(`✅ Created user: ${user.name}`);
      } else {
        console.log(`ℹ️  User already exists: ${user.name}`);
      }
      createdUsers.push(user);
    }
    
    // Create sample vouchers
    const voucherData = [
      {
        employeeName: 'John Doe',
        employeeId: createdUsers[0].id,
        formType: 'cash_payment',
        totalAmount: 2500,
        projectName: 'Project Alpha',
        status: 'pending',
        formData: {
          employeeName: 'John Doe',
          date: '2025-01-08',
          voucherNo: 'VCH2025010002',
          paymentDate: '2025-01-08',
          projectName: 'Project Alpha',
          ecLocation: 'Pune',
          bills: [
            { description: 'Office supplies', amount: 1500, date: '2025-01-07' },
            { description: 'Travel expenses', amount: 1000, date: '2025-01-08' }
          ],
          totalExpenses: 2500,
          advancePayment: 0,
          balanceReimbursement: 2500,
          amtInWords: 'Two Thousand Five Hundred Rupees Only',
          preparedBy: 'John Doe'
        },
        proofs: ['bill1.jpg', 'bill2.jpg']
      },
      {
        employeeName: 'Jane Smith',
        employeeId: createdUsers[1].id,
        formType: 'local_travel',
        totalAmount: 1800,
        projectName: 'Project Beta',
        status: 'pending',
        formData: {
          employeeName: 'Jane Smith',
          date: '2025-01-08',
          voucherNo: 'VCH2025010003',
          paymentDate: '2025-01-08',
          paymentMode: 'Cash',
          projectName: 'Project Beta',
          ecLocation: 'Mumbai',
          bills: [
            { description: 'Taxi fare', amount: 800, date: '2025-01-07' },
            { description: 'Meals', amount: 1000, date: '2025-01-08' }
          ],
          totalExpenses: 1800,
          amtInWords: 'One Thousand Eight Hundred Rupees Only',
          preparedBy: 'Jane Smith'
        },
        proofs: ['taxi_receipt.jpg', 'meal_receipt.jpg']
      },
      {
        employeeName: 'Mike Johnson',
        employeeId: createdUsers[2].id,
        formType: 'outstation_travel',
        totalAmount: 5000,
        projectName: 'Project Gamma',
        status: 'approved',
        formData: {
          employeeName: 'Mike Johnson',
          dateFrom: '2025-01-05',
          dateTo: '2025-01-07',
          dateOfSubmission: '2025-01-08',
          travelDescription: 'Client meeting in Delhi',
          projectName: 'Project Gamma',
          ecLocation: 'Pune',
          bills: [
            { description: 'Flight tickets', amount: 3000, date: '2025-01-05' },
            { description: 'Hotel stay', amount: 2000, date: '2025-01-06' }
          ],
          totalExpenses: 5000,
          advancePayment: 2000,
          balanceReimbursement: 3000,
          amtInWords: 'Five Thousand Rupees Only',
          preparedBy: 'Mike Johnson'
        },
        proofs: ['flight_ticket.jpg', 'hotel_bill.jpg'],
        approvedBy: 14, // Admin user ID
        approvedAt: new Date('2025-01-08T10:30:00Z')
      },
      {
        employeeName: 'Sarah Wilson',
        employeeId: createdUsers[3].id,
        formType: 'vendor_payment',
        totalAmount: 3500,
        projectName: 'Project Delta',
        status: 'rejected',
        formData: {
          vendorName: 'ABC Supplies',
          date: '2025-01-08',
          voucherNo: 'VCH2025010004',
          ecLocation: 'Pune',
          bills: [
            { description: 'Office equipment', amount: 3500, date: '2025-01-08' }
          ],
          totalExpenses: 3500,
          amtInWords: 'Three Thousand Five Hundred Rupees Only',
          preparedBy: 'Sarah Wilson'
        },
        proofs: ['equipment_invoice.jpg'],
        rejectedBy: 14, // Admin user ID
        rejectedAt: new Date('2025-01-08T14:20:00Z'),
        rejectionReason: 'Insufficient documentation provided'
      },
      {
        employeeName: 'David Brown',
        employeeId: createdUsers[4].id,
        formType: 'reimbursement',
        totalAmount: 1200,
        projectName: 'Project Epsilon',
        status: 'completed',
        formData: {
          type: 'medical',
          amount: 1200,
          description: 'Medical expenses for health checkup',
          billImage: 'medical_bill.jpg'
        },
        proofs: ['medical_bill.jpg'],
        approvedBy: 14, // Admin user ID
        approvedAt: new Date('2025-01-07T09:15:00Z'),
        transactionDate: new Date('2025-01-08T11:00:00Z'),
        completedBy: 14,
        completedAt: new Date('2025-01-08T11:00:00Z')
      }
    ];
    
    // Create vouchers
    for (const voucherInfo of voucherData) {
      const existingVoucher = await db.Voucher.findOne({ 
        where: { voucherNo: voucherInfo.formData?.voucherNo || `VCH${Date.now()}` } 
      });
      
      if (!existingVoucher) {
        const voucher = await db.Voucher.create({
          voucherNo: voucherInfo.formData.voucherNo,
          employeeName: voucherInfo.employeeName,
          employeeId: voucherInfo.employeeId,
          formType: voucherInfo.formType,
          formData: voucherInfo.formData,
          totalAmount: voucherInfo.totalAmount,
          proofs: voucherInfo.proofs,
          projectName: voucherInfo.projectName,
          ecLocation: voucherInfo.formData.ecLocation || 'Pune',
          status: voucherInfo.status,
          createdBy: voucherInfo.employeeId,
          approvedBy: voucherInfo.approvedBy,
          approvedAt: voucherInfo.approvedAt,
          rejectedBy: voucherInfo.rejectedBy,
          rejectedAt: voucherInfo.rejectedAt,
          rejectionReason: voucherInfo.rejectionReason,
          transactionDate: voucherInfo.transactionDate,
          completedBy: voucherInfo.completedBy,
          completedAt: voucherInfo.completedAt
        });
        
        console.log(`✅ Created voucher: ${voucher.voucherNo} for ${voucher.employeeName} (${voucher.status})`);
      } else {
        console.log(`ℹ️  Voucher already exists: ${voucherInfo.formData.voucherNo}`);
      }
    }
    
    console.log('\n🎉 Sample data created successfully!');
    console.log('\n📊 Summary:');
    console.log('- 5 sample users created');
    console.log('- 5 sample vouchers created with different statuses:');
    console.log('  • 2 Pending vouchers (John Doe, Jane Smith)');
    console.log('  • 1 Approved voucher (Mike Johnson)');
    console.log('  • 1 Rejected voucher (Sarah Wilson)');
    console.log('  • 1 Completed voucher (David Brown)');
    console.log('\n🔑 Admin Login:');
    console.log('Email: admin@test.com');
    console.log('Password: admin123');
    console.log('\n👥 Employee Logins:');
    console.log('All employees can login with password: password123');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

populateVouchers();
