// controllers/localTravelController.js
const db = require("../models");
const { LocalTravel, User } = db;
const { createVoucherFromForm } = require("../utils/voucherUtils");

// Create local travel request
exports.createLocalTravelRequest = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const formData = req.body;
    
    // Create local travel record
    const localTravel = await LocalTravel.create({
      ...formData,
      userId: user.id,
      status: "pending"
    });

    // Create voucher for approval workflow
    try {
      await createVoucherFromForm(formData, 'local_travel', user.id, user.name);
    } catch (voucherError) {
      console.error('Error creating voucher for local travel:', voucherError);
      // Don't fail the main request if voucher creation fails
    }

    res.status(201).json({ 
      success: true,
      message: "Local travel request submitted successfully", 
      data: localTravel 
    });
  } catch (err) {
    console.error("createLocalTravelRequest err:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get local travel requests
exports.getLocalTravelRequests = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    let whereClause = {};
    
    // If user is employee, only show their requests
    if (user.role === 'employee') {
      whereClause.userId = user.id;
    }
    // If user is manager, show their team's requests
    else if (user.role === 'manager') {
      const teamMembers = await User.findAll({ 
        where: { managerId: user.id }, 
        attributes: ['id'] 
      });
      const teamIds = teamMembers.map(member => member.id);
      whereClause.userId = teamIds;
    }
    // Admin can see all

    const requests = await LocalTravel.findAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email', 'role']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: requests
    });
  } catch (err) {
    console.error("getLocalTravelRequests err:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};
