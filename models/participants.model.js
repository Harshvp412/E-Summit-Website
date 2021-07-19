const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;
const { Mixed } = mongoose.Schema.Types;

const paticipantSchema = new mongoose.Schema({
	userID: { type: ObjectId, index: true },
	eventID: { type: ObjectId, index: true },

	round: Number,

	// Team specific
	teamName: String,
	isLeader: Boolean,
	leaderID: { type: String, index: true },

	teamID: { type: String },

	submissions: [
		{
			round: Number,
			submissionType: String,
			name: String,
			submission: Mixed,
			timestamp: Number,
		},
	],
	registrationDetails: Mixed,
	paymentDetails: {
		paymentID: String,
		captured: Boolean,
	},

	creationTime: { type: Number, default: Date.now },
	lastUpdated: { type: Number, default: Date.now },
});

paticipantSchema.pre("save", function (next) {
	const participant = this;
	participant.lastUpdated = Date.now();
	next();
});

paticipantSchema.pre("updateOne", function (next) {
	const participant = this;
	participant.lastUpdated = Date.now();
	next();
});

module.exports = mongoose.model("participants", paticipantSchema);
