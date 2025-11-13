const { Sequelize } = require("sequelize");
require("dotenv").config();

// ✅ Create Sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME || "reimbursement_db",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "root",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    port: process.env.DB_PORT || 3306,
    logging: false,
    dialectOptions: {
      ssl:
        process.env.DB_SSL === "true"
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
    },
  }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// ✅ Import models
db.User = require("./User")(sequelize, Sequelize.DataTypes);
db.Reimbursement = require("./Reimbursement")(sequelize, Sequelize.DataTypes);
db.CashPayment = require("./cashPayment")(sequelize, Sequelize.DataTypes);
db.LocalTravel = require("./LocalTravel")(sequelize, Sequelize.DataTypes);
db.OutstationTravel = require("./OutstationTravel")(
  sequelize,
  Sequelize.DataTypes
);
db.VendorPayment = require("./VendorPayment")(sequelize, Sequelize.DataTypes);
db.TravelPayment = require("./TravelPayment")(sequelize, Sequelize.DataTypes);
db.Voucher = require("./Voucher")(sequelize, Sequelize.DataTypes);

// ✅ Define associations

// --- Employee relationships ---
db.User.hasMany(db.CashPayment, { foreignKey: "userId", as: "cashPayments" });
db.CashPayment.belongsTo(db.User, { foreignKey: "userId", as: "user" });

db.User.hasMany(db.LocalTravel, { foreignKey: "userId", as: "localTravels" });
db.LocalTravel.belongsTo(db.User, { foreignKey: "userId", as: "user" });

db.User.hasMany(db.OutstationTravel, {
  foreignKey: "userId",
  as: "outstationTravels",
});
db.OutstationTravel.belongsTo(db.User, { foreignKey: "userId", as: "user" });

db.User.hasMany(db.VendorPayment, {
  foreignKey: "userId",
  as: "vendorPayments",
});
db.VendorPayment.belongsTo(db.User, { foreignKey: "userId", as: "user" });

db.User.hasMany(db.TravelPayment, {
  foreignKey: "userId",
  as: "travelPayments",
});
db.TravelPayment.belongsTo(db.User, { foreignKey: "userId", as: "user" });

// --- Voucher relationships ---
db.User.hasMany(db.Voucher, { foreignKey: "employeeId", as: "vouchers" });
db.Voucher.belongsTo(db.User, { foreignKey: "employeeId", as: "employee" });

db.User.hasMany(db.Voucher, {
  foreignKey: "approvedBy",
  as: "approvedVouchers",
});
db.Voucher.belongsTo(db.User, { foreignKey: "approvedBy", as: "approver" });

// ✅ NEW: Add manager-level tracking (for approvals & team linkage)
db.User.hasMany(db.Voucher, { foreignKey: "managerId", as: "managerVouchers" });
db.Voucher.belongsTo(db.User, { foreignKey: "managerId", as: "manager" });

// ✅ Optional: self-reference for team hierarchy (if not already in User model)
db.User.hasMany(db.User, { foreignKey: "managerId", as: "teamMembers" });
db.User.belongsTo(db.User, { foreignKey: "managerId", as: "manager" });

module.exports = db;
