const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Make it optional for now, but recommended to add later
  },
  location: String,
  dateTime: Date,
  goodsDescription: String,
  vehicleType: String,
  photo: {
    type: String,
    required: true,
  },
  // New route-related fields
  pickup: String,
  destination: String,
  routeDistance: String,
  routeCost: String,
  pickupCoords: String,
  destinationCoords: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_transit', 'delivered'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const Shipment = mongoose.model('Shipment', shipmentSchema);
module.exports = Shipment;
