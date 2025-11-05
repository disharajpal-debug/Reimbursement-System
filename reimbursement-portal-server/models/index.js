// models/index.js
const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "reimbursement_db",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "root",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mysql",
    //logging: false,
  }
);

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require("./User")(sequelize, Sequelize.DataTypes);
db.Reimbursement = require("./Reimbursement")(sequelize, Sequelize.DataTypes);
db.CashPayment = require("./cashPayment")(sequelize, Sequelize.DataTypes);
db.LocalTravel = require("./LocalTravel")(sequelize, Sequelize.DataTypes);
db.OutstationTravel = require("./OutstationTravel")(sequelize, Sequelize.DataTypes);
db.VendorPayment = require("./VendorPayment")(sequelize, Sequelize.DataTypes);
db.TravelPayment = require("./TravelPayment")(sequelize, Sequelize.DataTypes);
db.Voucher = require("./Voucher")(sequelize, Sequelize.DataTypes);

// Define associations
db.User.hasMany(db.CashPayment, { foreignKey: 'userId', as: 'cashPayments' });
db.CashPayment.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.User.hasMany(db.LocalTravel, { foreignKey: 'userId', as: 'localTravels' });
db.LocalTravel.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.User.hasMany(db.OutstationTravel, { foreignKey: 'userId', as: 'outstationTravels' });
db.OutstationTravel.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.User.hasMany(db.VendorPayment, { foreignKey: 'userId', as: 'vendorPayments' });
db.VendorPayment.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.User.hasMany(db.TravelPayment, { foreignKey: 'userId', as: 'travelPayments' });
db.TravelPayment.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.User.hasMany(db.Voucher, { foreignKey: 'employeeId', as: 'vouchers' });
db.Voucher.belongsTo(db.User, { foreignKey: 'employeeId', as: 'employee' });

db.User.hasMany(db.Voucher, { foreignKey: 'approvedBy', as: 'approvedVouchers' });
db.Voucher.belongsTo(db.User, { foreignKey: 'approvedBy', as: 'approver' });

module.exports = db;