const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
    // userId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'User',
    //     required: true,
    // },
    location: String,
    dateTime: Date,
    goodsDescription: String,   
    vehicleType: String,
    photo :{
        type: String,
        required: true,
    },
},{
    timestamps: true});

const Shipment = mongoose.model('Shipment', shipmentSchema);
module.exports = Shipment;
