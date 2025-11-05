module.exports = (sequelize, DataTypes) => {
  const OutstationTravel = sequelize.define("OutstationTravel", {
    employeeName: { type: DataTypes.STRING, allowNull: false },
    dateFrom: { type: DataTypes.STRING, allowNull: false },
    dateTo: { type: DataTypes.STRING, allowNull: false },
    dateOfSubmission: { type: DataTypes.STRING },
    travelDescription: { type: DataTypes.TEXT },
    projectName: { type: DataTypes.STRING },
    ecLocation: { type: DataTypes.STRING, defaultValue: "Pune" },
    bills: { type: DataTypes.JSON },
    totalExpenses: { type: DataTypes.FLOAT, defaultValue: 0 },
    amtInWords: { type: DataTypes.TEXT },
    advancePayment: { type: DataTypes.FLOAT, defaultValue: 0 },
    balanceReimbursement: { type: DataTypes.FLOAT, defaultValue: 0 },
    preparedBy: { type: DataTypes.STRING },
    receiverSign: { type: DataTypes.STRING },
    accountsSign: { type: DataTypes.STRING },
    authorizedSignatory: { type: DataTypes.STRING },
    voucherNo: { type: DataTypes.STRING },
    paymentDate: { type: DataTypes.STRING },
    proofs: { type: DataTypes.JSON },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: "pending" }, // Changed to STRING to support manager_approved
  });

  return OutstationTravel;
};
