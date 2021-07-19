const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
	items: [
		{
			key: String,
			size: String,
			quantity: Number,
		},
	],

	totalPrice: Number,

	deliveryDetails: {
		name: String,
		email: String,
		phone: String,

		address: { type: String, required: true },
		city: { type: String, required: true },
		pinCode: { type: String },
		state: { type: String, required: true },
	},

	paymentDetails: {
		paymentID: String,
		captured: Boolean,
	},

	delivered: Boolean,

	creationTime: { type: Number, default: Date.now },
	lastUpdated: { type: Number, default: Date.now },
});

orderSchema.pre("save", function (next) {
	this.lastUpdated = Date.now();
	next();
});

orderSchema.pre("updateOne", function (next) {
	this.lastUpdated = Date.now();
	next();
});

module.exports = mongoose.model("orders", orderSchema);
