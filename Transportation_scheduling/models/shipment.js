const mongoose = require('mongoose');

// Simple schema without custom ID - back to original
const shipmentSchema = new mongoose.Schema({
  location: String,
  pickup: String,
  destination: String,
  dateTime: Date,
  goodsDescription: String,
  vehicleType: String,
  photo: String,
  routeDistance: Number,
  routeCost: Number,
  pickupCoords: String,
  destinationCoords: String,
  userId: mongoose.Schema.Types.ObjectId,
  status: {
    type: String,
    default: 'pending'
  }
}, {
  timestamps: true
});

// No pre-save hooks, no custom ID logic
const Shipment = mongoose.model('Shipment', shipmentSchema);
module.exports = Shipment;
