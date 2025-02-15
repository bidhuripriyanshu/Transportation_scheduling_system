const mongoose = require("mongoose");

async function createNotification(shipmentId, status, message) {
    if (!shipmentId || !status || !message) {
        console.error("Error: Missing required fields");
        return;
    }

    try {
        const newNotification = new Notification({
            shipmentId: shipmentId,
            status: status,
            message: message
        });

        await newNotification.save();
        console.log("Notification saved:", newNotification);
    } catch (error) {
        console.error("Error saving notification:", error.message);
    }
}

// Example usage (ensure these values are passed)
createNotification("12345", "approved", "Your shipment has been approved!");

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
