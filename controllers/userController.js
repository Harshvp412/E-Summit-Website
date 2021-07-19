const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const eventsModel = require("../models/events.model");
const usersModel = require("../models/users.model");
const eventPassModel = require("../models/eventPass.model");

const getSummitID = require("../utils/getSummitID");
const logger = require("../utils/LoggerUtils");
const { process400, process500, processData, process401 } = require("../utils/ResponseUtils");
const {
	sendVerificationMail,
	sendPasswordResetMail,
	sendRegistrationSuccessMail,
} = require("../utils/EmailUtils");
const verifyRequest = require("../utils/VerifyRequest");
const participantsModel = require("../models/participants.model");
const workshopsModel = require("../models/workshops.model");

const ESUMMIT_SECRET =
	"e2af6c9bccc5ecdd6b56dd1bfe0171894ba66357b1079c9b3dead6575f291a2287703d70358018f1e5624378c669c8d390bad03692d2f832090069d73e558590";
// const isProduction = process.env.NODE_ENV === "production";
const isProduction = true;

//Verification route
exports.verifyAndSendMail = async (req, res) => {
	const { to: email } = req.query;

	try {
		let docs = await usersModel.find({ email: email.toLowerCase() }).exec();
		docs = docs || [];

		if (docs.length > 0) {
			process400(res, `The email, ${email} is already associated with another account.`);
			return;
		}
		const code = crypto.randomBytes(3).toString("hex").toUpperCase();

		try {
			await sendVerificationMail(email, code);
		} catch (error) {
			process500(res, "Mail coudn't be sent. Please try again tomorrow.");
			return;
		}
		//console.log(`Put ${code} as the verification code.`);

		res.cookie("ESUMMIT_IITM_VERIFICATION_TOKEN", code);
		processData(res, "Verification Email sent");
	} catch (error) {
		console.log(error);
		process500(res, error);
	}
};

//Register Route
exports.register = async (req, res) => {
	try {
		const hashedPassword = await bcrypt.hash(req.body.password, 10);
		const user = new usersModel({
			...req.body,
			email: req.body.email.toLowerCase(),
			password: hashedPassword,
		});
		// Get Summit ID
		user.summitID = getSummitID();
		await user.save();

		const { name, _id, email, summitID } = user.toObject();

		const token = jwt.sign({ name, _id, email, summitID }, ESUMMIT_SECRET);

		res.clearCookie("ESUMMIT_IITM_VERIFICATION_TOKEN");

		res.cookie("ESUMMIT_IITM_USER_SUMMIT_ID", user.summitID, {
			secure: isProduction,
		});
		res.cookie("ESUMMIT_IITM_USER_EMAIL_ID", user.email, {
			secure: isProduction,
		});
		res.cookie("ESUMMIT_IITM_AUTH_TOKEN", token, {
			secure: isProduction,
			httpOnly: true,
		});
		res.cookie("participatedEvents", JSON.stringify([]), {
			secure: isProduction,
		});
		res.cookie("ESUMMIT_ACCESS_PASS_AVAILED", false, {
			secure: isProduction,
		});

		// send mail
		try {
			await sendRegistrationSuccessMail(email, summitID);
		} catch (error) {
			process500(res, error);
			return;
		}

		processData(res, { summitID: user.summitID });
	} catch (error) {
		if (error.code === 11000) {
			const dupEmail = !!error.keyValue.email && error.keyValue.email;
			const dupSummitID = !!error.keyValue.summitID && error.keyValue.summitID;
			if (dupEmail) {
				process400(
					res,
					`The email, ${dupEmail} is already associated to another registered account. Please use another email.`
				);
				return;
			}
			if (dupSummitID) {
				logger.error(
					`Duplicate ID ${dupSummitID} detected. Probably a result of race condition or random generation. Re-registering...`
				);
				await this.register(req, res);
			}
		} else {
			process500(res, error);
		}
	}
};

//Login Route
exports.login = async (req, res) => {
	const { password } = req.body;
	const summitID = "ES21" + req.body.summitID;

	try {
		const user = await usersModel.findOne({ summitID }).exec();

		if (!user) {
			process400(res, "No user was found with the given Summit ID.");
			return;
		}

		const passwordCorrect = await bcrypt.compare(password, user.password);

		if (passwordCorrect) {
			const { name, _id, email, summitID, participatedEvents } = user.toObject();
			const eventDocs = await eventsModel.find({ _id: { $in: participatedEvents } }).exec();
			const eventNames = eventDocs.map(({ name }) => name);
			const eventPassAvailed = await eventPassModel.exists({ summitID });

			const token = jwt.sign({ name, _id, email, summitID }, ESUMMIT_SECRET);
			res.cookie("ESUMMIT_IITM_USER_SUMMIT_ID", summitID, {
				secure: isProduction,
			});
			res.cookie("ESUMMIT_IITM_USER_EMAIL_ID", email, {
				secure: isProduction,
			});
			res.cookie("ESUMMIT_IITM_AUTH_TOKEN", token, {
				secure: isProduction,
				httpOnly: true,
			});
			res.cookie("ESUMMIT_ACCESS_PASS_AVAILED", eventPassAvailed, {
				secure: isProduction,
			});
			res.cookie("participatedEvents", JSON.stringify(eventNames), {
				secure: isProduction,
			});
			processData(res, { summitID });
		} else {
			process401(res, "The password is incorrect.", "password_wrong");
		}
	} catch (error) {
		process500(res, "An error occured", error.message);
		console.log(error);
	}
};

exports.logout = async (req, res) => {
	try {
		verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);

		res.clearCookie("ESUMMIT_IITM_USER_SUMMIT_ID");
		res.clearCookie("ESUMMIT_IITM_USER_EMAIL_ID");
		res.clearCookie("ESUMMIT_IITM_AUTH_TOKEN");
		res.clearCookie("ESUMMIT_ACCESS_PASS_AVAILED");
		res.clearCookie("participatedEvents");

		processData(res, "Logged Out");
	} catch (error) {
		if (error.code === 9090) {
			process400(res, "Unauthorized Request");
		} else {
			logger.error(error);
			process500(res, "An error occured.");
		}
	}
};

//User check
exports.checkUser = async (req, res) => {
	try {
		if (req.params.by === "email") {
			const user = await usersModel.findOne({ email: req.query.email }).exec();
			res.send(user ? "false" : "true");
		} else if (req.params.by === "summitID") {
			let { summitID } = req.query;
			summitID =
				summitID.startsWith("ES21") && summitID.length === 8 ? summitID : `ES21${summitID}`;

			const user = await usersModel.findOne({ summitID }).exec();
			res.send(user ? "true" : "false");
		} else if (req.params.by === "phone") {
			const user = await usersModel.findOne({ phone: req.query.phone.toString() }).exec();
			res.send(user ? "false" : "true");
		} else if (req.params.by === "eventPass") {
			const {
				ESUMMIT_IITM_USER_SUMMIT_ID: summitID,
				ESUMMIT_ACCESS_PASS_AVAILED,
			} = req.cookies;

			if (!ESUMMIT_ACCESS_PASS_AVAILED) {
				const eventPassAvailed = await eventPassModel.exists({ summitID });
				res.send(eventPassAvailed);
			}
		}
	} catch (error) {
		console.log(error);
		// logger.error(error);
	}
};

exports.getDetails = async (req, res) => {
	try {
		const { _id } = verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);
		const user = await usersModel.findById(_id).exec();
		const { password, creationTime, lastUpdated, ...leanUser } = user.toObject();

		processData(res, leanUser);
	} catch (error) {
		console.log(error);
	}
};

exports.getEvents = async (req, res) => {
	try {
		const { _id: studentID } = verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);
		const user = await usersModel.findById(studentID).exec();
		const { participatedEvents } = user.toObject();

		const events = await eventsModel.find({ _id: { $in: participatedEvents } }).exec();

		const leanEvents = events.map((event) => {
			const {
				participants,
				teamLeaders,
				creationTime,
				lastUpdated,
				...leanEvent
			} = event.toObject();

			return leanEvent;
		});

		processData(res, leanEvents);
	} catch (error) {
		console.log(error);
	}
};

exports.getEventDetails = async (req, res) => {
	const { eventName } = req.params;
	try {
		const { _id: studentID } = verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);
		const eventDoc = await eventsModel.findOne({ name: eventName }).exec();
		const eventStatus = eventDoc.isLive;

		const participantDoc = await participantsModel
			.findOne({ userID: studentID, eventID: eventDoc._id })
			.exec();

		if (eventDoc.isTeamEvent) {
			const { leaderID } = participantDoc;
			const allParticipants = await participantsModel
				.find({ leaderID, eventID: eventDoc._id })
				.exec();

			const leaderDoc = allParticipants.find(({ isLeader }) => isLeader);

			const userIDs = allParticipants.map(({ userID }) => userID);
			const allMembers = await usersModel.find({ _id: { $in: userIDs } }).exec();

			const { name: leaderName } = allMembers.find(({ _id }) => leaderDoc.userID.equals(_id));
			const restMemberNames = allMembers
				.filter(({ _id }) => !leaderDoc.userID.equals(_id))
				.map(({ name }) => name);

			const { submissions } = leaderDoc;
			const submittedForCurrentRound =
				submissions && submissions.some(({ round }) => round === eventDoc.round);

			const eventDetails = {
				leaderName,
				memberNames: restMemberNames,
				eventStatus,
				displayName: eventDoc.displayName,
				round: eventDoc.round,
				participantRound: leaderDoc.round,
				isTeamEvent: true,
				isLeader: participantDoc.isLeader,
				submissionStatus: submittedForCurrentRound,
				registrationDetails: leaderDoc.registrationDetails,
				submissions: leaderDoc.submissions,
			};
			processData(res, eventDetails);
		} else {
			const eventDetails = {
				eventStatus,
				displayName: eventDoc.displayName,
				round: eventDoc.round,
				isTeamEvent: false,
				participantRound: participantDoc.round,
				submissions: participantDoc.submissions,
			};
			processData(res, eventDetails);
		}
	} catch (error) {
		console.log(error);
		process500(res, error.message);
	}
};

exports.resetPasswordMail = async (req, res) => {
	try {
		const { email } = req.query;
		//console.log(email);
		const user = await usersModel.findOne({ email });

		if (!user) {
			process400(res, "No account was found with the E-Mail.");
			return;
		}

		const pw = user.password;
		const code = crypto.createHash("md5").update(pw).digest("hex");

		// const rootURL =
		// 	isProduction
		// 		? "https://esummitiitm.org/"
		// 		: "https://esummitiitm.org";
		// const pwResetURL = encodeURI(
		// 	`${rootURL}/api/esummit-user/reset-password/${email}/?code=${code}`
		// );

		//console.log(code);
		try {
			await sendPasswordResetMail(email, code);
		} catch (error) {
			process500(res, error);
			return;
		}
		processData(res, "E-Mail sent.");
	} catch (error) {
		console.log(error);
		process500(res, error);
	}
};

exports.resetPasswordFromCode = async (req, res) => {
	const { email, newPassword, resetCode } = req.body;

	try {
		const user = await usersModel.findOne({ email });

		if (!user) {
			process400(res, "No account was found with the E-Mail.");
			return;
		}
		const pw = user.password;
		const codeFromUser = crypto.createHash("md5").update(pw).digest("hex");

		const resetCodeCorrect = resetCode === codeFromUser;

		if (resetCodeCorrect) {
			const newHashedPassword = await bcrypt.hash(newPassword, 10);
			user.password = newHashedPassword;

			await user.save();
			processData(res, "Updated!");
		} else {
			process400(res, "Reset code is incorrect");
		}
	} catch (error) {
		console.log(error);
		process500(res, error);
	}
};

exports.updateStudentData = async (req, res) => {
	const { updateType } = req.params;

	try {
		const { _id: userID } = verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);

		if (updateType === "info") {
			try {
				const dataToUpdate = req.body;

				await usersModel.updateOne({ _id: userID }, dataToUpdate).exec();

				processData(res, "data update");
			} catch (error) {
				if (error.code === 11000) {
					let duplicate = Object.getOwnPropertyNames(error.keyValue)[0];
					process400(
						res,
						`This ${
							duplicate == "phone" ? "Contact No." : "E-Mail ID"
						} is already associated to another account.`
					);
				} else {
					console.log(error);
					process500(res, error.message ? error.message : error);
				}
			}
		}

		if (updateType === "password") {
			try {
				const { currentPassword, newPassword } = req.body;

				const userDoc = await usersModel.findById(userID);

				let credentialsCorrect = await bcrypt.compare(currentPassword, userDoc.password);

				if (credentialsCorrect) {
					let hashedPassword = await bcrypt.hash(newPassword, 10);

					userDoc.password = hashedPassword;
					await userDoc.save();

					processData(res, "Successfully changed password.");
				} else {
					process400(
						res,
						"The current passsword you entered is wrong. Please ensure you've entered the correct password."
					);
					console.log("Wrong password for update");
				}
			} catch (error) {
				console.log(error);
				process500(res, error.message ? error.message : error);
			}
		}
	} catch (error) {
		console.log(error.message);
		if (error.message === "Not authorized") {
			process401(res, error);
			return;
		}
		process500(res);
	}
};

exports.getWorkshops = async (req, res) => {
	try {
		const { summitID } = verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);

		const userDoc = await usersModel.findOne({ summitID }).exec();

		if (userDoc.registeredWorkshops) {
			const workshopDocs = await workshopsModel
				.find({ key: { $in: userDoc.registeredWorkshops } })
				.exec();
			const leanWorkshops = workshopDocs.map(({ topic, date, sponsor }) => ({
				topic,
				date,
				sponsor,
			}));

			processData(res, leanWorkshops);
		} else {
			processData(res, []);
		}
	} catch (error) {
		process500(res);
		console.log(error);
	}
};
