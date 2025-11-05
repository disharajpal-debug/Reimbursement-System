// models/TravelRequest.js
const db = require("../models/index"); // MySQL connection

class TravelRequest {
  static create(data, callback) {
    const sql = `
      INSERT INTO travel_requests 
      (employeeName, employeeId, requestDate, travelLocation, departureDate, returnDate, duration, projectName, ecLocation, travelAdvance, purpose, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(
      sql,
      [
        data.employeeName,
        data.employeeId,
        data.requestDate,
        data.travelLocation,
        data.departureDate,
        data.returnDate,
        data.duration,
        data.projectName,
        data.ecLocation,
        data.travelAdvance,
        data.purpose,
        data.status || "Pending",
      ],
      callback
    );
  }

  static findAll(callback) {
    db.query("SELECT * FROM travel_requests", callback);
  }

  static findById(id, callback) {
    db.query("SELECT * FROM travel_requests WHERE id = ?", [id], callback);
  }

  static updateStatus(id, status, callback) {
    db.query("UPDATE travel_requests SET status = ? WHERE id = ?", [status, id], callback);
  }
}

module.exports = TravelRequest;
