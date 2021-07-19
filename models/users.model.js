const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
const { ObjectId } = mongoose.Schema.Types;

const userSchema = new mongoose.Schema({
	name: { type: String, required: true },

	summitID: { type: String, unique: true, required: true },
	email: { type: String, unique: true, required: true },
	password: { type: String, required: true },

	phone: {
		type: String,
		default: function () {
			return uuidv4();
		},
	},
	instituteName: { type: String },
	startupOwner: { type: String }, // "yes" or "no"

	participatedEvents: [ObjectId],
	registeredWorkshops: [String],

	// Optional
	dob: { type: String },
	branchOfStudy: { type: String },
	degree: String,
	yearOfStudy: String,
	linkedInURL: String,
	city: String,
	state: String,

	creationTime: { type: Number, default: Date.now },
	lastUpdated: { type: Number, default: Date.now },
});

userSchema.pre("save", function (next) {
	const user = this;
	user.lastUpdated = Date.now();
	next();
});

userSchema.pre("updateOne", function (next) {
	const user = this;
	user.lastUpdated = Date.now();
	next();
});

module.exports = mongoose.model("users", userSchema);
