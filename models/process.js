const mongoose = require('mongoose');

const processSchema = new mongoose.Schema({
    ConfirmationtId: {
        type: String,
        required: true,
        unique: true
    },
    Name: {
        type: String,
        required:true
    },
    payment: {
        type: String,    // Assuming ride number is a numeric value
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Process = mongoose.model('Process', processSchema);

module.exports = Process;
