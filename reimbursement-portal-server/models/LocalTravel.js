module.exports = (sequelize, DataTypes) => {
  const LocalTravel = sequelize.define("LocalTravel", {
    employeeName: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.STRING, allowNull: false },
    voucherNo: { type: DataTypes.STRING, allowNull: false },
    paymentDate: { type: DataTypes.STRING, allowNull: false },
    paymentMode: { type: DataTypes.STRING },
    projectName: { type: DataTypes.STRING },
    ecLocation: { type: DataTypes.STRING, defaultValue: "Pune" },
    bills: { type: DataTypes.JSON },
    totalExpenses: { type: DataTypes.FLOAT, defaultValue: 0 },
    amtInWords: { type: DataTypes.TEXT },
    preparedBy: { type: DataTypes.STRING },
    receiverSign: { type: DataTypes.STRING },
    accountsSign: { type: DataTypes.STRING },
    authorizedSignatory: { type: DataTypes.STRING },
    proofs: { type: DataTypes.JSON },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: "pending" }, // Changed to STRING to support manager_approved
  });

  return LocalTravel;
};
