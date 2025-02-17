const mongoose = require('mongoose');

const processSchema = new mongoose.Schema({
    shipmentId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'in-transit', 'delivered'],
        default: 'pending'
    },
    rideNo: {
        type: Number,    // Assuming ride number is a numeric value
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Process = mongoose.model('Process', processSchema);

module.exports = Process;
