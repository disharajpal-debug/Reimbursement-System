// Create sample vouchers for testing
const db = require('./models');

async function createSampleVouchers() {
  try {
    console.log('Creating sample vouchers...');
    
    // Get existing users
    const users = await db.User.findAll({ limit: 5 });
    if (users.length === 0) {
      console.log('No users found. Please create users first.');
      return;
    }
    
    // Create sample vouchers
    const vouchers = [
      {
        voucherNo: 'VCH2025010002',
        employeeName: users[0].name,
        employeeId: users[0].id,
        formType: 'cash_payment',
        totalAmount: 2500,
        projectName: 'Project Alpha',
        status: 'pending',
        formData: {
          employeeName: users[0].name,
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
          preparedBy: users[0].name
        },
        proofs: ['bill1.jpg', 'bill2.jpg'],
        createdBy: users[0].id
      },
      {
        voucherNo: 'VCH2025010003',
        employeeName: users[1]?.name || 'Jane Smith',
        employeeId: users[1]?.id || users[0].id,
        formType: 'local_travel',
        totalAmount: 1800,
        projectName: 'Project Beta',
        status: 'pending',
        formData: {
          employeeName: users[1]?.name || 'Jane Smith',
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
          preparedBy: users[1]?.name || 'Jane Smith'
        },
        proofs: ['taxi_receipt.jpg', 'meal_receipt.jpg'],
        createdBy: users[1]?.id || users[0].id
      },
      {
        voucherNo: 'VCH2025010004',
        employeeName: users[2]?.name || 'Mike Johnson',
        employeeId: users[2]?.id || users[0].id,
        formType: 'outstation_travel',
        totalAmount: 5000,
        projectName: 'Project Gamma',
        status: 'approved',
        formData: {
          employeeName: users[2]?.name || 'Mike Johnson',
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
          preparedBy: users[2]?.name || 'Mike Johnson'
        },
        proofs: ['flight_ticket.jpg', 'hotel_bill.jpg'],
        createdBy: users[2]?.id || users[0].id,
        approvedBy: 14, // Admin user ID
        approvedAt: new Date('2025-01-08T10:30:00Z')
      },
      {
        voucherNo: 'VCH2025010005',
        employeeName: users[3]?.name || 'Sarah Wilson',
        employeeId: users[3]?.id || users[0].id,
        formType: 'vendor_payment',
        totalAmount: 3500,
        projectName: 'Project Delta',
        status: 'rejected',
        formData: {
          vendorName: 'ABC Supplies',
          date: '2025-01-08',
          voucherNo: 'VCH2025010005',
          ecLocation: 'Pune',
          bills: [
            { description: 'Office equipment', amount: 3500, date: '2025-01-08' }
          ],
          totalExpenses: 3500,
          amtInWords: 'Three Thousand Five Hundred Rupees Only',
          preparedBy: users[3]?.name || 'Sarah Wilson'
        },
        proofs: ['equipment_invoice.jpg'],
        createdBy: users[3]?.id || users[0].id,
        rejectedBy: 14, // Admin user ID
        rejectedAt: new Date('2025-01-08T14:20:00Z'),
        rejectionReason: 'Insufficient documentation provided'
      },
      {
        voucherNo: 'VCH2025010006',
        employeeName: users[4]?.name || 'David Brown',
        employeeId: users[4]?.id || users[0].id,
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
        createdBy: users[4]?.id || users[0].id,
        approvedBy: 14, // Admin user ID
        approvedAt: new Date('2025-01-07T09:15:00Z'),
        transactionDate: new Date('2025-01-08T11:00:00Z'),
        completedBy: 14,
        completedAt: new Date('2025-01-08T11:00:00Z')
      }
    ];
    
    // Create vouchers
    for (const voucherInfo of vouchers) {
      const existingVoucher = await db.Voucher.findOne({ 
        where: { voucherNo: voucherInfo.voucherNo } 
      });
      
      if (!existingVoucher) {
        const voucher = await db.Voucher.create(voucherInfo);
        console.log(`✅ Created voucher: ${voucher.voucherNo} for ${voucher.employeeName} (${voucher.status})`);
      } else {
        console.log(`ℹ️  Voucher already exists: ${voucherInfo.voucherNo}`);
      }
    }
    
    console.log('\n🎉 Sample vouchers created successfully!');
    console.log('\n📊 Summary:');
    console.log('- Multiple vouchers with different statuses created');
    console.log('- You can now view them in the admin voucher approval page');
    console.log('\n🔑 Admin Login:');
    console.log('Email: admin@test.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('❌ Error creating sample vouchers:', error);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

createSampleVouchers();

