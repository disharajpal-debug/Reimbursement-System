// utils/auth.js
// Backwards-compatible exports used across routes in the project.

const { authenticateToken, authorizeRoles } = require("../middleware/authMiddleware");

const isAdmin = (req, res, next) => authorizeRoles("admin")(req, res, next);

module.exports = { authenticateToken, isAdmin, authorizeRoles };
