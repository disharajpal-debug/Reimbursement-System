// models/User.js
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("admin", "manager", "employee"),
      allowNull: false,
      defaultValue: "employee",
    },
    managerId: {
      type: DataTypes.INTEGER,
      allowNull: true, // only employees will have this
    },
  });

  // Relations
  User.associate = (models) => {
    // Employee belongs to a Manager
    User.belongsTo(models.User, {
      as: "manager",
      foreignKey: "managerId",
    });

    // Manager has many Employees
    User.hasMany(models.User, {
      as: "employees",
      foreignKey: "managerId",
    });
  };

  return User;
};
