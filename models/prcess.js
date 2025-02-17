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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Process = mongoose.model('Process', processSchema);

module.exports = Process;
