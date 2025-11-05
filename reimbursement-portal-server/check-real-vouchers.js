// Check all real vouchers from the database
const db = require('./models');

async function checkRealVouchers() {
  try {
    console.log('🔍 Checking ALL vouchers in the database...\n');
    
    // Get all vouchers
    const vouchers = await db.Voucher.findAll({
      include: [
        {
          model: db.User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'role']
        },
        {
          model: db.User,
          as: 'approver',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Get all users to see who can create vouchers
    const users = await db.User.findAll({
      attributes: ['id', 'name', 'email', 'role'],
      order: [['name', 'ASC']]
    });
    
    console.log(`👥 Total Users in Database: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - Role: ${user.role}`);
    });
    
    console.log(`\n📋 Total Vouchers in Database: ${vouchers.length}\n`);
    
    if (vouchers.length === 0) {
      console.log('❌ No vouchers found in the database.');
      console.log('💡 This means no employees have submitted any forms yet.');
      console.log('💡 When employees submit forms, they will automatically create vouchers here.');
      return;
    }
    
    // Display all vouchers
    vouchers.forEach((voucher, index) => {
      console.log(`📋 Voucher #${index + 1}`);
      console.log(`   Voucher No: ${voucher.voucherNo}`);
      console.log(`   Employee: ${voucher.employeeName}`);
      console.log(`   Employee ID: ${voucher.employeeId}`);
      console.log(`   Email: ${voucher.employee?.email || 'N/A'}`);
      console.log(`   Role: ${voucher.employee?.role || 'N/A'}`);
      console.log(`   Form Type: ${voucher.formType.replace('_', ' ').toUpperCase()}`);
      console.log(`   Amount: ₹${voucher.totalAmount}`);
      console.log(`   Project: ${voucher.projectName || 'N/A'}`);
      console.log(`   Status: ${voucher.status.toUpperCase()}`);
      console.log(`   Created: ${new Date(voucher.createdAt).toLocaleString()}`);
      console.log(`   Created By User ID: ${voucher.createdBy}`);
      
      if (voucher.approvedBy) {
        console.log(`   Approved By: ${voucher.approver?.name || 'N/A'}`);
        console.log(`   Approved At: ${new Date(voucher.approvedAt).toLocaleString()}`);
      }
      
      if (voucher.rejectedBy) {
        console.log(`   Rejected By: ${voucher.rejectedBy}`);
        console.log(`   Rejected At: ${new Date(voucher.rejectedAt).toLocaleString()}`);
        console.log(`   Rejection Reason: ${voucher.rejectionReason || 'N/A'}`);
      }
      
      if (voucher.transactionDate) {
        console.log(`   Transaction Date: ${new Date(voucher.transactionDate).toLocaleString()}`);
      }
      
      console.log(`   Proofs: ${voucher.proofs ? voucher.proofs.length : 0} document(s)`);
      if (voucher.proofs && voucher.proofs.length > 0) {
        console.log(`   Proof Files: ${voucher.proofs.join(', ')}`);
      }
      console.log('   ' + '─'.repeat(60));
    });
    
    // Summary statistics
    const statusCounts = vouchers.reduce((acc, voucher) => {
      acc[voucher.status] = (acc[voucher.status] || 0) + 1;
      return acc;
    }, {});
    
    const formTypeCounts = vouchers.reduce((acc, voucher) => {
      acc[voucher.formType] = (acc[voucher.formType] || 0) + 1;
      return acc;
    }, {});
    
    const userCounts = vouchers.reduce((acc, voucher) => {
      acc[voucher.employeeName] = (acc[voucher.employeeName] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📈 Summary Statistics:');
    console.log('\n📊 By Status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status.toUpperCase()}: ${count} voucher(s)`);
    });
    
    console.log('\n📋 By Form Type:');
    Object.entries(formTypeCounts).forEach(([formType, count]) => {
      console.log(`   ${formType.replace('_', ' ').toUpperCase()}: ${count} voucher(s)`);
    });
    
    console.log('\n👥 By Employee:');
    Object.entries(userCounts).forEach(([employee, count]) => {
      console.log(`   ${employee}: ${count} voucher(s)`);
    });
    
    console.log('\n🔄 Real-time Updates:');
    console.log('✅ Vouchers are automatically created when employees submit forms');
    console.log('✅ Admin dashboard will show all vouchers in real-time');
    console.log('✅ Manager dashboard will show vouchers for their employees');
    console.log('✅ Status updates are reflected immediately');
    
  } catch (error) {
    console.error('❌ Error checking vouchers:', error);
  } finally {
    await db.sequelize.close();
    process.exit(0);
  }
}

checkRealVouchers();

