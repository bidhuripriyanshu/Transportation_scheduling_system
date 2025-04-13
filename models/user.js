const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
});

// Add index for faster queries
userSchema.index({ email: 1 });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
