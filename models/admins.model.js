const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
	name: { type: String },
	email: { type: String, unique: true },
	password: { type: String },
	vertical: { type: String },
	controlledEvents: [mongoose.SchemaTypes.ObjectId],
	avatarUrl: { type: String },
	isEvaluator: { type: Boolean },

	creationTime: { type: Number, default: Date.now },
	lastUpdated: { type: Number, default: Date.now },
});

adminSchema.pre("save", function (next) {
	const admin = this;
	admin.lastUpdated = Date.now();
	next();
});

adminSchema.pre("updateOne", function (next) {
	const admin = this;
	admin.lastUpdated = Date.now();
	next();
});

module.exports = mongoose.model("admins", adminSchema);
