const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    shipmentId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["approved", "rejected", "pending"],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
