const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    location: String,
    dateTime: Date,
    goodsDescription: String,
    vehicleType: String,
});

const Shipment = mongoose.model('Shipment', shipmentSchema);
module.exports = Shipment;
