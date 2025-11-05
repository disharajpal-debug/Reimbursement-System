const db = require("../models");
const CashPayment = db.CashPayment;
const { createVoucherFromForm } = require('../utils/voucherUtils');

exports.createCashPayment = async (req, res) => {
  try {
    const payment = await CashPayment.create(req.body);
    
    // Create voucher automatically
    try {
      const formData = {
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
      };
      
      await createVoucherFromForm(formData, 'cash_payment', payment.userId, payment.employeeName);
    } catch (voucherError) {
      console.error('Error creating voucher for cash payment:', voucherError);
      // Don't fail the main request if voucher creation fails
    }
    
    res.status(201).json(payment);
  } catch (err) {
    console.error("CashPayment Create Error:", err);
    res.status(500).json({ error: "Failed to create CashPayment" });
  }
};

exports.getAllCashPayments = async (req, res) => {
  try {
    const payments = await CashPayment.findAll();
    res.status(200).json(payments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch payments" });
  }
};
