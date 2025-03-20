const mongoose = require('mongoose');

const processSchema = new mongoose.Schema({
    confirmationId: { type: String, required: true }, // Consistent field name
    Name: { type: String, required: true },
    Action: { type: String, required: true },
});

const Process = mongoose.model('Process', processSchema);
module.exports = Process;