const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, managerId } = req.body;

    // Check if email exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // If employee → must select manager
    if (role === "employee" && !managerId) {
      return res.status(400).json({ message: "Employee must have a manager" });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      managerId: role === "employee" ? managerId : null,
    });

    // Generate token so the registering user is logged in immediately
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "mysecretkey",
      { expiresIn: "1d" }
    );

    res.json({
      message: "User registered successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        managerId: user.managerId,
      },
      token,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", { email }); // Log the attempt

    const user = await User.findOne({ where: { email } });
    console.log("User found:", user ? "yes" : "no"); // Log if user was found

    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "mysecretkey",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        managerId: user.managerId,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Fetch all managers (for dropdown in register form)
exports.getManagers = async (req, res) => {
  try {
    const managers = await User.findAll({ where: { role: "manager" } });
    res.json(managers);
  } catch (err) {
    console.error("Get managers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
