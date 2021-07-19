const mongoose = require("mongoose");

const workshopOrderSchema = new mongoose.Schema({
	summitID: { type: String, required: true },

	// consists of both combo and workshop keys
	items: [String],
	// array of workshop keys coupon was redeemed for
	couponRedeemedFor: [String],
	referralCode: String,

	totalPrice: Number,
	paymentDetails: {
		paymentID: String,
		captured: Boolean,
	},

	creationTime: { type: Number, default: Date.now },
	lastUpdated: { type: Number, default: Date.now },
});

workshopOrderSchema.pre("save", function (next) {
	this.lastUpdated = Date.now();
	next();
});

workshopOrderSchema.pre("updateOne", function (next) {
	this.lastUpdated = Date.now();
	next();
});

module.exports = mongoose.model("workshopOrders", workshopOrderSchema);
