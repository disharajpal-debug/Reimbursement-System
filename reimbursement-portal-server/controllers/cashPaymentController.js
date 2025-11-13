const db = require("../models");
const CashPayment = db.CashPayment;
const { createVoucherFromForm } = require("../utils/voucherUtils");

exports.createCashPayment = async (req, res) => {
  try {
    const payment = await CashPayment.create(req.body);

    // NOTE: We no longer auto-create a Voucher record here to avoid duplicating
    // requests in both the cash payment table and the vouchers table.
    // Voucher creation should be an explicit action (or handled centrally) if needed.

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
