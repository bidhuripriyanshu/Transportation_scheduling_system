const mongoose = require('mongoose');

const transporterSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
});

module.exports = mongoose.model('User', transporterSchema);
