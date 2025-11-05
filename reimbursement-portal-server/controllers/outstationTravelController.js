// controllers/outstationTravelController.js
const db = require("../models");
const { OutstationTravel, User } = db;
const { createVoucherFromForm } = require("../utils/voucherUtils");

// Create outstation travel request
exports.createOutstationTravelRequest = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const formData = req.body;
    
    // Create outstation travel record
    const outstationTravel = await OutstationTravel.create({
      ...formData,
      userId: user.id,
      status: "pending"
    });

    // Create voucher for approval workflow
    try {
      await createVoucherFromForm(formData, 'outstation_travel', user.id, user.name);
    } catch (voucherError) {
      console.error('Error creating voucher for outstation travel:', voucherError);
      // Don't fail the main request if voucher creation fails
    }

    res.status(201).json({ 
      success: true,
      message: "Outstation travel request submitted successfully", 
      data: outstationTravel 
    });
  } catch (err) {
    console.error("createOutstationTravelRequest err:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get outstation travel requests
exports.getOutstationTravelRequests = async (req, res) => {
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

    const requests = await OutstationTravel.findAll({
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
    console.error("getOutstationTravelRequests err:", err);
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

