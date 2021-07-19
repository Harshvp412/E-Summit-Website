const usersModel = require("../models/users.model");
const eventModel = require("../models/events.model");
const participantsModel = require("../models/participants.model");

const logger = require("../utils/LoggerUtils");
const { processData, process400, process500 } = require("../utils/ResponseUtils");
const verifyRequest = require("../utils/VerifyRequest");

const ESUMMIT_SECRET =
	"e2af6c9bccc5ecdd6b56dd1bfe0171894ba66357b1079c9b3dead6575f291a2287703d70358018f1e5624378c669c8d390bad03692d2f832090069d73e558590";

/**
 * The Registration route for all the events
 * Make sure to pass the event name as a param
 *
 * @param {express.Request} req
 * @param {express.Response} res
 */

async function updateOptionalFields(additionalUserDetails, user, eventID) {
	const { degree, yearOfStudy, linkedInURL, city, state } = additionalUserDetails;

	user.participatedEvents.push(eventID);
	user.degree = user.degree || degree;
	user.yearOfStudy = user.yearOfStudy || yearOfStudy;
	user.linkedInURL = user.linkedInURL || linkedInURL;
	user.city = user.city || city;
	user.state = user.state || state;

	await user.save();
}

const teamRegister = async (req, res) => {
	const { event: eventName } = req.params;
	const { teamName, leaderID: leaderSummitID, members, registrationDetails } = req.body;

	try {
		const dupeTeam = await participantsModel.findOne({ teamName }).exec();
		if (dupeTeam) {
			process400(res, "Team Name already exists. Please choose a different name.");

			return;
		}

		// Get the corresponding event doc
		const eventDoc = await eventModel.findOne({ name: eventName });

		// Get all users according to the summitID
		const summitIDs = members.map((member) => member.summitID);
		const userDocs = await usersModel.find({ summitID: { $in: summitIDs } }).exec();

		// Filter out leader _id and all member IDs
		const { _id: leaderUserID } = userDocs.find((user) => user.summitID === leaderSummitID);

		// Check if someone already registered. If yes, then yeet an error at them
		const someoneAlreadyRegistered = userDocs.some(({ participatedEvents }) =>
			participatedEvents.includes(eventDoc._id)
		);
		if (someoneAlreadyRegistered) {
			process400(
				res,
				"Some students from your team are already registered for this event. Please check."
			);
			return;
		}

		// Make leader participant doc
		const leaderParticipantDoc = participantsModel({
			userID: leaderUserID,
			eventID: eventDoc._id,
			round: 1,
			teamName,
			isLeader: true,
			registrationDetails,
		});
		leaderParticipantDoc.leaderID = leaderParticipantDoc._id.toString();
		const { leaderID, _id: leaderObjectID } = await leaderParticipantDoc.save();

		// Make participant docs from the retreived info
		const participantObjs = userDocs
			.filter((user) => user.summitID !== leaderSummitID)
			.map((user) => ({
				userID: user._id,
				eventID: eventDoc._id,
				round: 1,
				teamName,
				leaderID,
				isLeader: false,
				registrationDetails,
			}));
		let participantDocs = await participantsModel.create(participantObjs);
		//check for single player
		participantDocs = participantDocs || [];
		const participantIDs = participantDocs.map(({ _id }) => _id);
		// Add participants to the event doc
		eventDoc.participants.push(...participantIDs, leaderObjectID);
		eventDoc.teamLeaders.push(leaderID);
		await eventDoc.save();

		// Add the event to the user doc and update the necessary details
		userDocs.forEach(async (user) => {
			const { degree, yearOfStudy, linkedInURL, city, state } = members.find(
				(member) => member.summitID === user.summitID
			);
			await updateOptionalFields(
				{ degree, yearOfStudy, linkedInURL, city, state },
				user,
				eventDoc._id
			);
		});

		logger.info(
			`Registered for ${eventName}: [Team Name] ${teamName}, [Leader] ${leaderSummitID}`
		);

		// TODO: send registration mail to all

		processData(res, "Successfully registered.");
	} catch (error) {
		logger.error(error);
		console.log(error);
		process500(res, error.message);
	}
};

const soloRegister = async (req, res) => {
	const { event: eventName } = req.params;
	const { registrationDetails, ...additionalUserDetails } = req.body;

	try {
		const { _id: userID } = verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);

		// Get the corresponding event doc
		const eventDoc = await eventModel.findOne({ name: eventName });
		const eventID = eventDoc._id;

		// Get the user according to their summitID
		const userDoc = await usersModel.findById(userID).exec();

		// Check if they're already registered. If yes, then yeet an error at them
		const alreadyRegistered = userDoc.participatedEvents.includes(eventID);
		if (alreadyRegistered) {
			process400(res, "Your are already registered for this event. Please check.");
			return;
		}

		// Make participant docs from the retreived info
		const participantDoc = await participantsModel({
			userID,
			eventID: eventDoc._id,
			round: 1,
			registrationDetails,
		}).save();

		// Add participants to the event doc
		eventDoc.participants.push(participantDoc._id);
		await eventDoc.save();

		// Add the event to the user doc and update the necessary details
		await updateOptionalFields(additionalUserDetails, userDoc, eventID);

		// send mail
		processData(res, "Successfully registered.");
	} catch (error) {
		logger.error(error);
		console.log(error);
		process500(res, error.message);
	}
};

const addMemberToTeam = async (req, res) => {
	const { password } = req.params;
	if (password === "weboops") {
		try {
			const { eventName, leaderEmail, userDetails } = req.body;
			const userSummitIDs = userDetails.map((user) => user.summitID);

			const eventDoc = await eventModel.findOne({ name: eventName }).exec();
			const userDocs = await usersModel.find({ summitID: { $in: userSummitIDs } }).exec();
			const leaderUserDoc = await usersModel.findOne({ email: leaderEmail }).exec();
			const {
				_id: leaderID,
				teamName,
				registrationDetails,
			} = await participantsModel
				.findOne({ userID: leaderUserDoc._id, eventID: eventDoc._id })
				.exec();

			const participantObjs = userDocs.map((user) => ({
				userID: user._id,
				eventID: eventDoc._id,
				round: eventDoc.round,
				teamName,
				leaderID: leaderID.toString(),
				isLeader: false,
				registrationDetails,
			}));

			let participantDocs = await participantsModel.create(participantObjs);

			participantDocs = participantDocs || [];
			const participantIDs = participantDocs.map(({ _id }) => _id);

			eventDoc.participants.push(...participantIDs);
			await eventDoc.save();

			// Add the event to the user doc and update the necessary details
			userDocs.forEach(async (user) => {
				const { degree, yearOfStudy, linkedInURL, city, state } = userDetails.find(
					(member) => member.summitID === user.summitID
				);
				await updateOptionalFields(
					{ degree, yearOfStudy, linkedInURL, city, state },
					user,
					eventDoc._id
				);
			});
			res.statusCode = 200;
			res.send("updated");
		} catch (error) {
			res.statusCode = 500;
			console.log(error);
			res.send(error.message ? error.message : error);
		}
	} else {
		res.statusCode = 401;
		res.send("who tf are you?");
	}
};

module.exports = { teamRegister, soloRegister, addMemberToTeam };
