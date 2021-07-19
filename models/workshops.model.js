const mongoose = require("mongoose");

const workshopSchema = new mongoose.Schema({
	// This is an identifier
	// ex: design-thinking
	key: {
		type: String,
		unique: true,
		lowercase: true,
	},
	// This is the Full Topic Name
	// ex: Design Thinking
	topic: String,
	track: String,
	sponsor: String,
	date: String,

	couponsRedeemed: {
		type: Number,
		min: 0,
		max: 50,
	},
	registrants: [String],

	creationTime: { type: Number, default: Date.now },
	lastUpdated: { type: Number, default: Date.now },
});

workshopSchema.method("incrementRedeemedCouponsCount", function () {
	this.couponsRedeemed += 1;
});

workshopSchema.pre("save", function (next) {
	const workshop = this;
	workshop.lastUpdated = Date.now();
	next();
});

workshopSchema.pre("updateOne", function (next) {
	const workshop = this;
	workshop.lastUpdated = Date.now();
	next();
});

module.exports = mongoose.model("workshops", workshopSchema);
