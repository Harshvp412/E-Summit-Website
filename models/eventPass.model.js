const mongoose = require("mongoose");

const eventPassSchema = new mongoose.Schema({
	summitID: { type: String, required: true, unique: true },

	couponRedeemed: Boolean,
	referralCode: String,

	totalPrice: Number,
	paidBy: String,

	paymentDetails: {
		paymentID: String,
		captured: Boolean,
	},

	creationTime: { type: Number, default: Date.now },
	lastUpdated: { type: Number, default: Date.now },
});

eventPassSchema.pre("save", function (next) {
	this.lastUpdated = Date.now();
	next();
});

eventPassSchema.pre("updateOne", function (next) {
	this.lastUpdated = Date.now();
	next();
});

module.exports = mongoose.model("eventPasses", eventPassSchema);
