module.exports = (sequelize, DataTypes) => {
  const CashPayment = sequelize.define("CashPayment", {
    employeeName: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    voucherNo: { type: DataTypes.STRING, allowNull: false },
    paymentDate: { type: DataTypes.STRING, allowNull: false },
    projectName: { type: DataTypes.STRING },
    ecLocation: { type: DataTypes.STRING, defaultValue: "Pune" },
    bills: { type: DataTypes.JSON }, // store bills with proof file paths
    totalExpenses: { type: DataTypes.FLOAT, defaultValue: 0 },
    advancePayment: { type: DataTypes.FLOAT, defaultValue: 0 },
    balanceReimbursement: { type: DataTypes.FLOAT, defaultValue: 0 },
    amtInWords: { type: DataTypes.TEXT },
    preparedBy: { type: DataTypes.STRING },
    receiverSign: { type: DataTypes.STRING },
    accountsSign: { type: DataTypes.STRING },
    authorizedSignatory: { type: DataTypes.STRING },
    userId: { type: DataTypes.INTEGER, allowNull: false }, // Link to user
    status: { type: DataTypes.STRING, defaultValue: "pending" }, // Changed to STRING to support manager_approved
  });

  return CashPayment;
};
