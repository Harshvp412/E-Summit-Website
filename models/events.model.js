const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
	// This is an identifier
	// ex: product-construct
	name: {
		type: String,
		unique: true,
		lowercase: true,
	},
	// This is required to display on frontend
	// ex: Product Construct
	displayName: String,
	isTeamEvent: { type: Boolean },

	round: { type: Number },
	isLive: { type: Boolean },
	numOfRounds: { type: Number },

	participants: [mongoose.SchemaTypes.ObjectId],
	teamLeaders: [String],

	ignoredTeamRegistrationEmails: [String],

	creationTime: { type: Number, default: Date.now },
	lastUpdated: { type: Number, default: Date.now },
});

eventSchema.pre("save", function (next) {
	const event = this;
	event.lastUpdated = Date.now();
	next();
});

eventSchema.pre("updateOne", function (next) {
	const event = this;
	event.lastUpdated = Date.now();
	next();
});

module.exports = mongoose.model("events", eventSchema);
