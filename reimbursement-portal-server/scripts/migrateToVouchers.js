// Migration script to convert existing form data to vouchers
const db = require('../models');
const { Op } = require('sequelize');

const generateVoucherNumber = async () => {
  const prefix = 'VCH';
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  const lastVoucher = await db.Voucher.findOne({
    where: {
      voucherNo: {
        [Op.like]: `${prefix}${year}${month}%`
      }
    },
    order: [['voucherNo', 'DESC']]
  });
  
  let sequence = 1;
  if (lastVoucher) {
    const lastSequence = parseInt(lastVoucher.voucherNo.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `${prefix}${year}${month}${String(sequence).padStart(4, '0')}`;
};

const migrateCashPayments = async () => {
  console.log('Migrating Cash Payments...');
  
  const cashPayments = await db.CashPayment.findAll({
    include: [{ model: db.User, as: 'user' }]
  });
  
  for (const payment of cashPayments) {
    try {
      const voucherNo = await generateVoucherNumber();
      
      const voucherData = {
        voucherNo,
        employeeName: payment.employeeName,
        employeeId: payment.userId,
        formType: 'cash_payment',
        formData: {
          employeeName: payment.employeeName,
          date: payment.date,
          voucherNo: payment.voucherNo,
          paymentDate: payment.paymentDate,
          projectName: payment.projectName,
          ecLocation: payment.ecLocation,
          bills: payment.bills || [],
          totalExpenses: payment.totalExpenses,
          advancePayment: payment.advancePayment,
          balanceReimbursement: payment.balanceReimbursement,
          amtInWords: payment.amtInWords,
          preparedBy: payment.preparedBy,
          receiverSign: payment.receiverSign,
          accountsSign: payment.accountsSign,
          authorizedSignatory: payment.authorizedSignatory
        },
        totalAmount: payment.totalExpenses,
        proofs: payment.bills || [],
        projectName: payment.projectName,
        ecLocation: payment.ecLocation,
        status: payment.status,
        createdBy: payment.userId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      };
      
      await db.Voucher.create(voucherData);
      console.log(`✓ Migrated Cash Payment ${payment.id} to Voucher ${voucherNo}`);
    } catch (error) {
      console.error(`✗ Error migrating Cash Payment ${payment.id}:`, error.message);
    }
  }
};

const migrateLocalTravels = async () => {
  console.log('Migrating Local Travels...');
  
  const localTravels = await db.LocalTravel.findAll({
    include: [{ model: db.User, as: 'user' }]
  });
  
  for (const travel of localTravels) {
    try {
      const voucherNo = await generateVoucherNumber();
      
      const voucherData = {
        voucherNo,
        employeeName: travel.employeeName,
        employeeId: travel.userId,
        formType: 'local_travel',
        formData: {
          employeeName: travel.employeeName,
          date: travel.date,
          voucherNo: travel.voucherNo,
          paymentDate: travel.paymentDate,
          paymentMode: travel.paymentMode,
          projectName: travel.projectName,
          ecLocation: travel.ecLocation,
          bills: travel.bills || [],
          totalExpenses: travel.totalExpenses,
          amtInWords: travel.amtInWords,
          preparedBy: travel.preparedBy,
          receiverSign: travel.receiverSign,
          accountsSign: travel.accountsSign,
          authorizedSignatory: travel.authorizedSignatory,
          proofs: travel.proofs || []
        },
        totalAmount: travel.totalExpenses,
        proofs: travel.proofs || travel.bills || [],
        projectName: travel.projectName,
        ecLocation: travel.ecLocation,
        status: travel.status,
        createdBy: travel.userId,
        createdAt: travel.createdAt,
        updatedAt: travel.updatedAt
      };
      
      await db.Voucher.create(voucherData);
      console.log(`✓ Migrated Local Travel ${travel.id} to Voucher ${voucherNo}`);
    } catch (error) {
      console.error(`✗ Error migrating Local Travel ${travel.id}:`, error.message);
    }
  }
};

const migrateOutstationTravels = async () => {
  console.log('Migrating Outstation Travels...');
  
  const outstationTravels = await db.OutstationTravel.findAll({
    include: [{ model: db.User, as: 'user' }]
  });
  
  for (const travel of outstationTravels) {
    try {
      const voucherNo = await generateVoucherNumber();
      
      const voucherData = {
        voucherNo,
        employeeName: travel.employeeName || 'N/A',
        employeeId: travel.userId,
        formType: 'outstation_travel',
        formData: {
          employeeName: travel.employeeName || 'N/A',
          dateFrom: travel.dateFrom,
          dateTo: travel.dateTo,
          dateOfSubmission: travel.dateOfSubmission,
          travelDescription: travel.travelDescription,
          projectName: travel.projectName,
          ecLocation: travel.ecLocation,
          bills: travel.bills || [],
          totalExpenses: travel.totalExpenses,
          amtInWords: travel.amtInWords,
          advancePayment: travel.advancePayment,
          balanceReimbursement: travel.balanceReimbursement,
          preparedBy: travel.preparedBy,
          receiverSign: travel.receiverSign,
          accountsSign: travel.accountsSign,
          authorizedSignatory: travel.authorizedSignatory,
          voucherNo: travel.voucherNo,
          paymentDate: travel.paymentDate,
          proofs: travel.proofs || []
        },
        totalAmount: travel.totalExpenses,
        proofs: travel.proofs || travel.bills || [],
        projectName: travel.projectName,
        ecLocation: travel.ecLocation,
        status: travel.status,
        createdBy: travel.userId,
        createdAt: travel.createdAt,
        updatedAt: travel.updatedAt
      };
      
      await db.Voucher.create(voucherData);
      console.log(`✓ Migrated Outstation Travel ${travel.id} to Voucher ${voucherNo}`);
    } catch (error) {
      console.error(`✗ Error migrating Outstation Travel ${travel.id}:`, error.message);
    }
  }
};

const migrateVendorPayments = async () => {
  console.log('Migrating Vendor Payments...');
  
  const vendorPayments = await db.VendorPayment.findAll({
    include: [{ model: db.User, as: 'user' }]
  });
  
  for (const payment of vendorPayments) {
    try {
      const voucherNo = await generateVoucherNumber();
      
      const voucherData = {
        voucherNo,
        employeeName: payment.vendorName || 'N/A',
        employeeId: payment.userId,
        formType: 'vendor_payment',
        formData: {
          vendorName: payment.vendorName,
          date: payment.date,
          voucherNo: payment.voucherNo,
          ecLocation: payment.ecLocation,
          bills: payment.bills || [],
          totalExpenses: payment.totalExpenses,
          amtInWords: payment.amtInWords,
          preparedBy: payment.preparedBy,
          receiverSign: payment.receiverSign,
          accountsSign: payment.accountsSign,
          authorizedSignatory: payment.authorizedSignatory,
          proofs: payment.proofs || []
        },
        totalAmount: payment.totalExpenses,
        proofs: payment.proofs || payment.bills || [],
        projectName: null,
        ecLocation: payment.ecLocation,
        status: payment.status,
        createdBy: payment.userId,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt
      };
      
      await db.Voucher.create(voucherData);
      console.log(`✓ Migrated Vendor Payment ${payment.id} to Voucher ${voucherNo}`);
    } catch (error) {
      console.error(`✗ Error migrating Vendor Payment ${payment.id}:`, error.message);
    }
  }
};

const migrateReimbursements = async () => {
  console.log('Migrating Reimbursements...');
  
  const reimbursements = await db.Reimbursement.findAll({
    include: [{ model: db.User, as: 'user' }]
  });
  
  for (const reimbursement of reimbursements) {
    try {
      const voucherNo = await generateVoucherNumber();
      
      const voucherData = {
        voucherNo,
        employeeName: reimbursement.user?.name || 'N/A',
        employeeId: reimbursement.userId,
        formType: 'reimbursement',
        formData: {
          type: reimbursement.type,
          amount: reimbursement.amount,
          description: reimbursement.description,
          billImage: reimbursement.billImage
        },
        totalAmount: reimbursement.amount,
        proofs: reimbursement.billImage ? [reimbursement.billImage] : [],
        projectName: null,
        ecLocation: 'Pune',
        status: reimbursement.status,
        createdBy: reimbursement.userId,
        createdAt: reimbursement.createdAt,
        updatedAt: reimbursement.updatedAt
      };
      
      await db.Voucher.create(voucherData);
      console.log(`✓ Migrated Reimbursement ${reimbursement.id} to Voucher ${voucherNo}`);
    } catch (error) {
      console.error(`✗ Error migrating Reimbursement ${reimbursement.id}:`, error.message);
    }
  }
};

const runMigration = async () => {
  try {
    console.log('Starting migration to vouchers...');
    
    // Check if vouchers already exist
    const existingVouchers = await db.Voucher.count();
    if (existingVouchers > 0) {
      console.log(`Found ${existingVouchers} existing vouchers. Skipping migration.`);
      return;
    }
    
    await migrateCashPayments();
    await migrateLocalTravels();
    await migrateOutstationTravels();
    await migrateVendorPayments();
    await migrateReimbursements();
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
};

// Run migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  runMigration,
  migrateCashPayments,
  migrateLocalTravels,
  migrateOutstationTravels,
  migrateVendorPayments,
  migrateReimbursements
};

