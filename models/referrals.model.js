const mongoose = require("mongoose");

const referralCodeSchema = new mongoose.Schema({
	referralCode: {
		type: String,
		unique: true,
		uppercase: true,
	},
	workshopRedeemCount: { type: Number, default: 0 },
	eventPassRedeemCount: { type: Number, default: 0 },
	creationTime: { type: Number, default: Date.now },
	lastUpdated: { type: Number, default: Date.now },
});

referralCodeSchema.pre("save", function (next) {
	this.lastUpdated = Date.now();
	next();
});

referralCodeSchema.pre("updateOne", function (next) {
	this.lastUpdated = Date.now();
	next();
});

module.exports = mongoose.model("referralCodes", referralCodeSchema);
