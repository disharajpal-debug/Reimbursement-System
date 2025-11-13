module.exports = (sequelize, DataTypes) => {
  const Voucher = sequelize.define("Voucher", {
    voucherNo: { type: DataTypes.STRING, allowNull: false, unique: true },
    employeeName: { type: DataTypes.STRING, allowNull: false },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    managerId: { type: DataTypes.INTEGER, allowNull: true },
    formType: {
      type: DataTypes.ENUM(
        "cash_payment",
        "local_travel",
        "outstation_travel",
        "vendor_payment",
        "reimbursement"
      ),
      allowNull: false,
    },
    formData: { type: DataTypes.JSON },
    totalAmount: { type: DataTypes.FLOAT, defaultValue: 0 },
    proofs: { type: DataTypes.JSON },
    projectName: { type: DataTypes.STRING },
    ecLocation: { type: DataTypes.STRING, defaultValue: "Pune" },
    description: { type: DataTypes.TEXT },
    remarks: { type: DataTypes.TEXT },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "managerApproved",
        "approved",
        "rejected",
        "completed"
      ),
      defaultValue: "pending",
    },
    createdBy: { type: DataTypes.INTEGER },
    updatedBy: { type: DataTypes.INTEGER },
    approvedBy: { type: DataTypes.INTEGER },
    approvedAt: { type: DataTypes.DATE },
    rejectedBy: { type: DataTypes.INTEGER },
    rejectedAt: { type: DataTypes.DATE },
    rejectionReason: { type: DataTypes.TEXT },
    transactionDate: { type: DataTypes.DATE },
    completedBy: { type: DataTypes.INTEGER },
    completedAt: { type: DataTypes.DATE },
  });

  Voucher.associate = (models) => {
    // Employee who created the voucher
    Voucher.belongsTo(models.User, {
      as: "employee",
      foreignKey: "employeeId",
    });

    // Manager of the employee
    Voucher.belongsTo(models.User, {
      as: "manager",
      foreignKey: "managerId",
    });

    // User who approved the voucher
    Voucher.belongsTo(models.User, {
      as: "approver",
      foreignKey: "approvedBy",
    });
  };

  return Voucher;
};
