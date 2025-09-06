const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    shipmentId: { type: String, required: true },
    Rideno: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comments: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Feedback = mongoose.model('Feedback', feedbackSchema);
module.exports = Feedback;