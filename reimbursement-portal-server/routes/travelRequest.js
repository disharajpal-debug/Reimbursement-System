// routes/travelRequest.js
const express = require("express");
const router = express.Router();
const TravelRequest = require("../models/TravelRequest");

// Create new request
router.post("/", async (req, res) => {
  try {
    const request = new TravelRequest(req.body);
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all requests
router.get("/", async (req, res) => {
  const requests = await TravelRequest.find();
  res.json(requests);
});

module.exports = router;
