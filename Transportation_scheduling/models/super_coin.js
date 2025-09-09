const mongoose = require('mongoose');

const superCoinSchema = new mongoose.Schema({
    coins: { type: Number, required: true, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});

const SuperCoin = mongoose.model('SuperCoin', superCoinSchema);
module.exports = SuperCoin;