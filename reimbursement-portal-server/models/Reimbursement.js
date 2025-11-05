// models/Reimbursement.js
module.exports = (sequelize, DataTypes) => {
  const Reimbursement = sequelize.define(
    "Reimbursement",
    {
      // who submitted it
      userId: { type: DataTypes.INTEGER, allowNull: false },

      // type of reimbursement, e.g., travel, food, cab
      type: { type: DataTypes.STRING, allowNull: false },

      // monetary fields
      amount: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },

      // description & bill image path
      description: { type: DataTypes.TEXT, allowNull: true },
      billImage: { type: DataTypes.STRING, allowNull: true },

      // workflow status
      status: {
        type: DataTypes.STRING, // Changed to STRING to support manager_approved
        defaultValue: "pending",
      },
    },
    {
      tableName: "reimbursements",
      timestamps: true,
    }
  );

  return Reimbursement;
};
