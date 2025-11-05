// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const db = require("../models");
const { User } = db;

// Authenticate token & attach user
exports.authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "mysecretkey";

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(403).json({ error: "Forbidden: Invalid or expired token" });
    }

    // Attempt to fetch the real user from DB using common payload shapes
    let user = null;
    if (decoded.id) user = await User.findByPk(decoded.id);
    else if (decoded.userId) user = await User.findByPk(decoded.userId);
    else if (decoded.email) user = await User.findOne({ where: { email: decoded.email } });
    else if (decoded.user && decoded.user.id) user = await User.findByPk(decoded.user.id);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized: user not found" });
    }

    // Attach lean user object
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role || "").toString(),
      managerId: user.managerId || null,
    };

    next();
  } catch (error) {
    console.error("authMiddleware error:", error);
    res.status(500).json({ error: "Internal server error in authentication" });
  }
};

// Role-based middleware (fixed export and guard)
exports.authorizeRoles = (...allowedRoles) => {
  const allowed = allowedRoles.map((r) => r.toString().toLowerCase());
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const userRole = (req.user.role || "").toString().toLowerCase();
    if (!allowed.includes(userRole)) return res.status(403).json({ error: "Forbidden: insufficient rights" });
    next();
  };
};
