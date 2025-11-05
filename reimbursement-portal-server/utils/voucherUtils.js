const db = require('../models');
const { Op } = require('sequelize');

// Generate unique voucher number
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

// Create voucher from form data
const createVoucherFromForm = async (formData, formType, userId, employeeName) => {
  try {
    const voucherNo = await generateVoucherNumber();
    
    // Calculate total amount based on form type
    let totalAmount = 0;
    switch (formType) {
      case 'cash_payment':
        totalAmount = formData.totalExpenses || 0;
        break;
      case 'local_travel':
        totalAmount = formData.totalExpenses || 0;
        break;
      case 'outstation_travel':
        totalAmount = formData.totalExpenses || 0;
        break;
      case 'vendor_payment':
        totalAmount = formData.totalExpenses || 0;
        break;
      case 'reimbursement':
        totalAmount = formData.amount || 0;
        break;
      default:
        totalAmount = 0;
    }
    
    const voucherData = {
      voucherNo,
      employeeName,
      employeeId: userId,
      formType,
      formData,
      totalAmount,
      proofs: formData.proofs || formData.bills || [],
      projectName: formData.projectName || null,
      ecLocation: formData.ecLocation || 'Pune',
      description: formData.description || null,
      createdBy: userId,
      status: 'pending'
    };
    
    const voucher = await db.Voucher.create(voucherData);
    console.log(`✓ Created voucher ${voucherNo} for ${formType} form`);
    return voucher;
    
  } catch (error) {
    console.error(`Error creating voucher for ${formType}:`, error);
    throw error;
  }
};

module.exports = {
  generateVoucherNumber,
  createVoucherFromForm
};

