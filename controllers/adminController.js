const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const crypto = require("crypto");

const DBUtils = require("../utils/DBUtils")();
const {
	process400,
	process401,
	process404,
	process500,
	processData,
} = require("../utils/ResponseUtils");

const getSummitID = require("../utils/getSummitID");
const logger = require("../utils/LoggerUtils");

const {
	sendVerificationMail,
	sendPasswordResetMail,
	sendRegistrationSuccessMail,
	sendRegistrationSuccessMailforCSV,
	sendMailForUnsuccessfulTeamRegistration,
	sendRegistrationSuccessMailforCSVEventOnly,
} = require("../utils/EmailUtils");

const userController = require("../controllers/userController");

const adminsModel = require("../models/admins.model");
const eventsModel = require("../models/events.model");
const usersModel = require("../models/users.model");
const participantsModel = require("../models/participants.model");

const ResponseUtils = require("../utils/ResponseUtils");
const { promiseImpl } = require("ejs");
const { info } = require("../utils/LoggerUtils");

const ESUMMIT_ADMIN_SIGNATURE_STRING =
	"7067ddadd31277d34f9a1eb135ec3a10b88aca50636fa17c6125b9b8fbaf0d9e80c1e578a71dde1fc1c21324b065461c3efed3ffd2dc7869634361245741ed8e";
//Change this string!!!!
const noAuthTokenErr = new Error("Not authorized");
noAuthTokenErr.code = 9090;

function makeid(length) {
	var result = "";
	var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}

const verifyRequest = (reqCookies) => {
	if (!reqCookies) throw noAuthTokenErr;

	const ecellAuthCookie = reqCookies
		.split(";")
		// Note: This `token` starts with a whitespace. Hence the trim method in the filtering.
		.filter((str) => str.trim().startsWith("ECELL_AUTH_TOKEN"))[0];

	if (!ecellAuthCookie) throw noAuthTokenErr;

	const token = ecellAuthCookie.split("=")[1];
	const payload = jwt.verify(token, ESUMMIT_ADMIN_SIGNATURE_STRING);

	return payload;
};

exports.login = async (req, res) => {
	//console.log(req.body, "req.body");
	try {
		const { email, password } = req.body;

		let admin = await DBUtils.getEntity(adminsModel, { email });
		//console.log(admin._doc, "addjnkdl");
		admin = admin._doc;

		if (!admin) {
			process404(res, "No account was found with the E-Mail.");
			return;
		}

		let eventIDs = admin.controlledEvents;
		//console.log(eventIDs, "eventIDs");

		let credentialsCorrect = await bcrypt.compare(password, admin.password);
		if (credentialsCorrect) {
			try {
				// let admin = await DBUtils.getEntity(adminsModel, { email: email });
				let eventIDs = admin.controlledEvents;
				let events = await DBUtils.getEntityForIds(eventsModel, eventIDs);
				// console.log(`events`, events);

				admin = { ...admin, events: events };
				let signedToken = jwt.sign(
					{ adminID: admin._id, email: admin.email },
					ESUMMIT_ADMIN_SIGNATURE_STRING
				);

				res.cookie("ECELL_LOGGED_IN", "admin");
				res.cookie("ECELL_AUTH_TOKEN", signedToken, {
					sameSite: false,
					// httpOnly: true,
					// Use below with https
					// secure: true,
					// domain: "https://e-summit-2021-admin-front-end-git-master.ashishshroti14.vercel.app",
					// crossDomain: true
				});

				// res.set('Access-Control-Allow-Origin', 'http://localhost:5100');
			} catch (err) {
				console.log(err);
				res.status(500).send(err);
			}
			// console.log(admin,"admin")
			processData(res, admin);
		} else {
			process401(res, "Wrong Password.");
		}
	} catch (error) {
		console.log(error);
		process500(res, "An error occured", error.message);
	}
};

exports.logout = async (req, res) => {
	try {
		verifyRequest(req.headers.cookie);

		res.clearCookie(`ECELL_LOGGED_IN`);
		res.clearCookie(`ECELL_AUTH_TOKEN`);
		processData(res, "Logged out");
	} catch (err) {
		console.log(err.message);
		process500(res, err.message);
	}
};

exports.resetPasswordMail = async (req, res) => {
	try {
		const { email } = req.query;
		//console.log(email);
		const admin = await adminsModel.findOne({ email });

		if (!admin) {
			process400(res, "No account was found with the E-Mail.");
			return;
		}

		const pw = admin.password;
		const code = crypto.createHash("md5").update(pw).digest("hex").slice(24);
		// console.log(pw, code)

		// const rootURL =
		// 	isProduction
		// 		? "https://esummitiitm.org/"
		// 		: "https://esummitiitm.org";
		// const pwResetURL = encodeURI(
		// 	`${rootURL}/api/esummit-user/reset-password/${email}/?code=${code}`
		// );

		console.log(code);
		await sendPasswordResetMail(email, code);
		processData(res, "E-Mail sent.");
	} catch (error) {
		console.log(error);
		process500(res, "Sorry. An error occured.");
	}
};

exports.resetPasswordFromCode = async (req, res) => {
	const { email, newPassword, resetCode } = req.body;

	try {
		const admin = await adminsModel.findOne({ email });

		if (!admin) {
			process400(res, "No account was found with the E-Mail.");
			return;
		}
		const pw = admin.password;
		const codeFromUser = crypto.createHash("md5").update(pw).digest("hex").slice(24);

		const resetCodeCorrect = resetCode === codeFromUser;

		if (resetCodeCorrect) {
			const newHashedPassword = await bcrypt.hash(newPassword, 10);
			admin.password = newHashedPassword;

			await admin.save();
			processData(res, "Updated!");
		} else {
			process400(res, "Reset code is incorrect");
		}
	} catch (error) {
		console.log(error);
		process500(res, "Sorry. An error occured.");
	}
};

exports.getEvents = async (req, res) => {
	try {
		let { adminID } = verifyRequest(req.headers.cookie);

		let admin = await DBUtils.getEntity(adminsModel, { _id: adminID });
		let eventIDs = admin.controlledEvents;
		//console.log(eventIDs);

		let events = await DBUtils.getEntityForIds(eventsModel, eventIDs);
		//console.log(`events`, events);
		processData(res, events);
	} catch (error) {
		if (error === "Invalid 'for' query") {
			process400(res, error);
		} else {
			process500(res, error.message ? error.message : error);
		}
	}
};

exports.getParticipants = async (req, res) => {
	try {
		let { adminID } = verifyRequest(req.headers.cookie);
		let { eventID } = req.body;

		let event = await DBUtils.getEntity(eventsModel, { _id: eventID });
		let participantIds = event.participants;
		// console.log(participantIds, "fghj");

		const participants = await DBUtils.getEntityForIds(participantsModel, participantIds);

		const userIDs = participants.map((participant) => {
			// console.log(participant._doc.userID, "cghiio")
			return participant._doc.userID;
		});
		// console.log(userIDs, "qwerty");
		const users = await DBUtils.getEntityForIds(usersModel, userIDs);
		// console.log("users", users);
		// console.log(`participants`, participants);

		const updatedParticipants = participants.map((participant) => {
			const userInfo = users.filter((user) => {
				// console.log(
				// 	user._doc._id,
				// 	participant._doc.userID,
				// 	user._doc._id.toString() === participant._doc.userID.toString(),
				// 	"check"
				// );

				if (user._doc._id.toString() === participant._doc.userID.toString()) {
					// console.log(user, "cuyibk")

					// console.log(
					// 	{
					// 		...participant._doc,
					// 		name: user._doc.name,
					// 		email: user._doc.email,
					// 		instituteName: user._doc.instituteName,
					// 		phone: user._doc.phone,
					// 		summitID: user._doc.summitID,
					// 	},
					// 	"user"
					// );
					return {
						...participant._doc,
						name: user.name,
						email: user.email,
						instituteName: user.instituteName,
						phone: user.phone,
						summitID: user.summitID,
					};
				}
			})[0];
			// console.log(userInfo, "userInfo");
			return {
				...participant._doc,
				pdfSubmissionUrls: participant._doc.pdfSubmissionUrls,
				textSubmissionUrls: participant.textSubmissionUrls,
				name: userInfo._doc.name,
				email: userInfo._doc.email,
				instituteName: userInfo._doc.instituteName,
				phone: userInfo._doc.phone,
				summitID: userInfo._doc.summitID,
			};
		});
		// console.log(updatedParticipants, "updatedParticipants");
		processData(res, updatedParticipants);
	} catch (error) {
		if (error === "Invalid 'for' query") {
			process400(res, error);
		} else {
			process500(res, error.message ? error.message : error);
		}
	}
};

exports.registerThroughCSV = async (req, res) => {
	try {
		var successfullyRegisteredParticipants = [];

		var successfullyRegisteredParticipantEmails = [];

		const { adminID } = verifyRequest(req.headers.cookie);
		const { CSVParticipants, isTeamEvent, eventID } = req.body.participants;
		// console.log(CSVParticipantsWithRandomPhoneNum, "CSVParticipants")

		const existingParticipants = await DBUtils.getEntities(participantsModel, {
			eventID: eventID,
		});
		const existingParticipantEmails = await existingParticipants.map(async (participant) => {
			const user = await DBUtils.getEntity(usersModel, { _id: participant.userID });

			return user.email;
		});
		const validCSVParticipants = CSVParticipants.filter(
			(participant) => participant.email !== undefined
		);

		var incomingEmails = validCSVParticipants.map((participant) => participant.email);

		var alreadyRegisteredEmails = [];

		var unregisteredTeamIDs = [];
		// var alreadyRegisteredParticipants = [];

		// console.log(existingUsers, "existingUsers");

		// CSVParticipants.map((participant) => console.log(participant.email, "patygaxbjndsan"));

		// const { CSVParticipants, isTeamEvent, eventID } = req.body.participants;

		// const registerUsersThroughCSV = async (req, res, callback) => {
		// 	try {
		// 		// const { CSVParticipants, isTeamEvent, eventID } = req.body.participants;

		// 		// const existingUsers = await DBUtils.getAllEntities(usersModel);
		// 		// console.log(existingUsers, "existingUsers");

		// 		// CSVParticipants.map((participant) => console.log(participant.email, "patygaxbjndsan"));

		// 		// const validCSVParticipants = CSVParticipants.filter(
		// 		// 	(participant) => participant.email !== undefined
		// 		// );
		// 		// console.log(validCSVParticipants, isTeamEvent, "CSVParticipants, isTeamEvent");

		// 		// const existingEmails = existingUsers.map((user) => user.email);

		// 		const CSVUsers = await validCSVParticipants.map((user) => {
		// 			if (isTeamEvent) {
		// 				return {
		// 					state: user.state,
		// 					name: user.name,
		// 					teamName: user.teamName,
		// 					type: user.type,
		// 					round: user.round,
		// 					email: user.email,
		// 					phone: user.phone,
		// 					instituteName: user.instituteName,
		// 					degree: user.degree,
		// 					startupOwner: user.startupOwner,
		// 					dob: user.dob,
		// 					branchOfStudy: user.branchOfStudy,
		// 					yearOfStudy: user.yearOfStudy,
		// 					linkedInURL: user.linkedInURL,
		// 					city: user.city,
		// 					password: makeid(6),
		// 					// participatedEvents: [eventID],
		// 				};
		// 			} else {
		// 				return {
		// 					state: user.state,
		// 					name: user.name,
		// 					// teamName: user.teamName,
		// 					// type: user.type,
		// 					round: user.round,
		// 					email: user.email,
		// 					phone: user.phone,
		// 					instituteName: user.instituteName,
		// 					degree: user.degree,
		// 					startupOwner: user.startupOwner,
		// 					dob: user.dob,
		// 					branchOfStudy: user.branchOfStudy,
		// 					yearOfStudy: user.yearOfStudy,
		// 					linkedInURL: user.linkedInURL,
		// 					city: user.city,
		// 					password: makeid(6),
		// 					// participatedEvents: [eventID],
		// 				};
		// 			}
		// 		});

		// 		const newCSVUsers = CSVUsers.filter(
		// 			(user) =>
		// 				!existingEmails.filter((existingEmail) => user.email === existingEmail)
		// 					.length
		// 		);
		// 		console.log(newCSVUsers, "newCSVUsers");

		// 		// await DBUtils.bulkInsertEntities(usersModel, newCSVUsers)

		// 		await callback(newCSVUsers);
		// 		console.log("done :)");
		// 	} catch (error) {
		// 		console.log(error);
		// 		process500(res, error.message ? error.message : error);
		// 	}
		// };

		const registerParticipantsThroughCSV = async () => {
			const teamRegister = async (eventID, team, res) => {
				var passwordObjs = [];
				// console.log(
				// 	eventID,
				// 	team,

				// 	"aaaaaa"
				// );

				for (let i = 0; i < team.length; i++) {
					const member = team[i];
					const password = await register(member);
					passwordObjs.push({
						email: member.email,
						password: password,
					});
				}

				// const anotherPromise = await Promise.all(arr1);

				var memberEmails = team.map((member) => member.email);

				var users = await usersModel
					.find({
						email: {
							$in: memberEmails,
						},
					})
					.exec();

				const teamWithRegisteredUsers = users.map((user, i) => {
					const member = team.find((member) => member.email === user.email);
					return { ...member, summitID: user.summitID, userID: user._id };
				});

				// console.log(teamWithRegisteredUsers, "teamWithRegisteredUsers");

				// await team.map(async (member) => {

				// 	// const user  = await usersModel
				// 	const user = await DBUtils.getEntity(usersModel, { email: member.email });
				// 	return { ...member, summitID: user.summitID, userID: user._id };
				// });

				// teamWithRegisteredUsers = await Promise.all(teamWithRegisteredUsers);

				// console.log(teamWithRegisteredUsers, "teamWithRegisteredUsers");

				// const {  eventID } = req.eventID;
				var leaderUser = teamWithRegisteredUsers.filter((user) =>
					user.type.toLowerCase().includes("leader")
				)[0];

				if (leaderUser) {
					leaderUser = {
						...leaderUser,
						registrationDetails: {
							source: leaderUser.source,
							stream: leaderUser.stream,
						},
					};
					// console.log(leaderUser, eventID, "leaderUser");

					// const {
					// 	eventID,
					// 	teamName,
					// 	leaderID: leaderSummitID,
					// 	teamID,
					// 	members,
					// 	registrationDetails,
					// } = req.body;

					try {
						// const dupeTeam = await participantsModel.findOne({ teamName }).exec();
						// var updatedTeamName = null;
						// if (dupeTeam) {
						// 	// process400(res, "Team Name already exists. Please choose a different name.");
						// 	updatedTeamName = teamName + leaderSummitID;

						// 	// return;
						// }

						// Get the corresponding event doc
						const eventDoc = await eventsModel.findOne({ _id: eventID });

						// Get all users according to the summitID
						// const summitIDs = members.map((member) => member.summitID);
						const userDocs = await usersModel
							.find({
								summitID: {
									$in: teamWithRegisteredUsers.map((member) => member.summitID),
								},
							})
							.exec();

						// Filter out leader _id and all member IDs
						// const { _id: leaderUserID,  } = userDocs.find(
						// 	(user) => user.summitID === leaderSummitID
						// );
						// const userIDs = userDocs.map((user) => user._id);

						// Check if someone already registered. If yes, then yeet an error at them
						// const someoneAlreadyRegistered = userIDs.filter((id) =>
						// 	userDocs
						// 		.filter((userDoc) => userDoc._id === id)[0]
						// 		.participatedEvents.includes(eventID)
						// );
						// if (someoneAlreadyRegistered) {
						// 	logger.info(`Team with teamID ${members[0].teamID} was not registered.`);

						// 	unregisteredTeamIDs.push(member[0].teamID);
						// 	return;
						// }

						// Make leader participant doc

						const leaderParticipantDoc = participantsModel({
							userID: leaderUser.userID,
							eventID: eventID,
							round: 1,
							teamName: leaderUser.teamName,
							isLeader: true,
							teamID: leaderUser.teamID,
							registrationDetails: leaderUser.registrationDetails,
						});
						leaderParticipantDoc.leaderID = leaderParticipantDoc._id.toString();
						const { leaderID, _id: leaderObjectID } = await leaderParticipantDoc.save();

						// Make participant docs from the retreived info
						const participantObjs = userDocs
							.filter((user) => user.summitID !== leaderUser.summitID)
							.map((user) => ({
								userID: user._id,
								eventID: eventID,
								round: 1,
								teamName: user.teamName,
								leaderID,
								isLeader: false,
								teamID: leaderUser.teamID,
							}));
						const participantDocs = await participantsModel.create(participantObjs);
						const participantIDs = participantDocs
							? participantDocs.map(({ _id }) => _id)
							: [];

						// Promise.all([leaderParticipantDoc]);
						// Promise.all(participantDocs);
						// Add participants to the event doc
						eventDoc.participants.push(...participantIDs, leaderObjectID);
						eventDoc.teamLeaders.push(leaderID);
						await eventDoc.save();

						teamWithRegisteredUsers.map(async (member) => {
							const passwordObj = passwordObjs.filter(
								(passwordObj) => passwordObj.email === member.email
							)[0];
							// console.log(passwordObj, "passwordObj");

							// console.log(member, "member");
							var userDoc = await usersModel.findOne({ _id: member.userID });
							// console.log(userDoc, "userDoc");
							userDoc.participatedEvents.push(eventID);
							await userDoc.save();

							if (passwordObj.password === false) {
								try {
									sendRegistrationSuccessMailforCSVEventOnly(
										userDoc.email,
										userDoc.name,
										userDoc.summitID,
										eventDoc.name,
										eventDoc.displayName
									);
								} catch (error) {
									process500(res, error);
									return;
								}
								// console.log("only-event");
							} else {
								console.log(passwordObj, "passwordObj");
								try {
									sendRegistrationSuccessMailforCSV(
										userDoc.email,
										userDoc.name,
										userDoc.summitID,
										passwordObj.password,
										eventDoc.name,
										eventDoc.displayName
									);
								} catch (error) {
									process500(res, error);
									return;
								}
								// console.log("Both");
							}
						});
						logger.info(
							`Registered for ${eventID}: [Team Name] ${leaderUser.teamName}, [Leader] ${leaderUser.summitID}`
						);
						successfullyRegisteredParticipants.push(...participantIDs, leaderObjectID);
						successfullyRegisteredParticipantEmails.push(...memberEmails);
						logger.info(`send mail for registration`);

						// Add the event to the user doc and update the necessary details
						// userDocs.forEach(async (user) => {
						// 	const { degree, yearOfStudy, linkedInURL, city, state } = members.find(
						// 		(member) => member.summitID === user.summitID
						// 	);
						// 	await updateOptionalFields(
						// 		{ degree, yearOfStudy, linkedInURL, city, state },
						// 		user,
						// 		eventDoc._id
						// 	);
						// });

						// send registration mail to all?
						// await sendVerificationMail()
						// processData(res, "Successfully registered.");
					} catch (error) {
						logger.error(error);
						console.log(error);
						// process500(res, error.message);
					}
				} else {
					logger.error("Team wasn't registered for the event");
				}
			};

			const soloRegister = async (eventID, participant, res) => {
				// const { event: eventID } = req.params;
				// const { eventID, participant} = req.body;

				try {
					var thisParticipantEmail = participant.email;
					// console.log(
					// 	eventID,
					// 	participant,

					// 	"aaaaaa"
					// );

					const password = await register(participant);
					// console.log(password, "password, here");

					// const user = await DBUtils.getEntity(usersModel, { email: participant.email })
					// const registeredParticipant = { ...member, summitID: user.summitID, userID: user._id }

					// const { _id: userID, participatedEvents } = verifyRequest(
					// 	req,
					// 	"ESUMMIT_IITM_AUTH_TOKEN",
					// 	ESUMMIT_SECRET
					// );
					participant = {
						...participant,
						registrationDetails: {
							source: participant.source,
							stream: participant.stream,
						},
					};

					// Get the corresponding event doc
					const eventDoc = await eventsModel.findOne({ _id: eventID });
					// const eventID = eventDoc._id;

					// Get the user according to their summitID
					var userDoc = await usersModel.findOne({ email: participant.email });

					// const userID = userDoc._id;

					// Check if they're already registered. If yes, then yeet an error at them
					const participants = await DBUtils.getEntityForIds(
						participantsModel,
						eventDoc.participants
					);
					// console.log(participants, "participants");
					const userIDs = participants.map((participant) => participant.userID);
					const users = await DBUtils.getEntityForIds(usersModel, userIDs);
					const summitIDs = users.map((user) => user.summitID);

					if (userDoc) {
						const alreadyRegistered = summitIDs.includes(userDoc.summitID);
						if (alreadyRegistered) {
							alreadyRegisteredEmails.push(participant.email);
							logger.info(
								`${participant.name} already registered for this event. Please check.`
							);
							// alreadyRegisteredParticipants.push;
							return;
						}
						const participantDoc = await participantsModel({
							userID: userDoc._id,
							eventID: eventDoc._id,
							round: 1,
							registrationDetails: participant.registrationDetails,
						}).save();

						eventDoc.participants.push(participantDoc._id);
						await eventDoc.save();

						userDoc.participatedEvents.push(eventID);
						await userDoc.save();

						logger.info("Successfully registered.");
						successfullyRegisteredParticipants.push(participantDoc._id);
						successfullyRegisteredParticipantEmails.push(thisParticipantEmail);
					} else {
						console.log("User registration not done ");
					}

					// Make participant docs from the retreived info

					// Add participants to the event doc

					// var FinalUserDoc = await usersModel.findOne({ _id: member.userID });
					// console.log(userDoc, "userDoc");

					// Add the event to the user doc and update the necessary details
					// await updateOptionalFields(additionalUserDetails, userDoc, eventID);

					if (password === false) {
						try {
							sendRegistrationSuccessMailforCSVEventOnly(
								userDoc.email,
								userDoc.name,
								userDoc.summitID,
								eventDoc.name,
								eventDoc.displayName
							);
						} catch (error) {
							process500(res, error);
							return;
						}
					} else {
						try {
							sendRegistrationSuccessMailforCSV(
								userDoc.email,
								userDoc.name,
								userDoc.summitID,
								password,
								eventDoc.name,
								eventDoc.displayName
							);
						} catch (error) {
							process500(res, error);
							return;
						}
					}
				} catch (error) {
					logger.error(error);
					console.log(error);
					// process500(res, error.message);
				}
			};

			if (isTeamEvent) {
				// const updatedValidCSVParticipants = validCSVParticipants.map( (participant) => {

				// 	return {
				// 		eventID,
				// 		teamID: participant.teamID,
				// 		round: participant.round,
				// 		teamName: participant.teamName,
				// 		leaderID: participant.teamID,
				// 		isLeader: Boolean(participant.type.toLowerCase() === "leader"),
				// 		registrationDetails: {
				// 			source: participant.source,
				// 			stream: participant.stream,
				// 		},
				// 	};
				// });
				// console.log(updatedValidCSVParticipants," updatedValidCSVParticipants")

				const teamIDs = validCSVParticipants.map((participant) => participant.teamID);
				const existingParticipants = await DBUtils.getEntities(participantsModel, {
					eventID: eventID,
				});
				const existingTeamIDs = existingParticipants.map(
					(participant) => participant.teamID
				);

				// console.log(existingTeamIDs, "existingTeamIDs");

				// var uniqueTeamIDs = [];
				// teamIDs.map((teamID) => {
				// 	if (!uniqueTeamIDs.filter((uniqueTeamID) => uniqueTeamID === teamID).length) {
				// 		uniqueTeamIDs.push(teamID);
				// 		//console.log(uniqueTeamIDs, "uniqueTeamIDs");
				// 		return teamID;
				// 	} else return null;
				// });

				const uniqueTeamIDs = Array.from(new Set(teamIDs));

				// console.log(uniqueTeamIDs, "uniqueTeamIDs");

				// const users = await DBUtils.getAllEntities(usersModel);

				const teams = uniqueTeamIDs.map((uniqueTeamID) => {
					return validCSVParticipants.filter(
						(participant) => participant.teamID === uniqueTeamID
					);
				});

				//filters out the teams with fresh team ids
				const newTeams = teams.filter((team) => !existingTeamIDs.includes(team[0].teamID));

				// console.log(newTeams, "newTeams");

				const eventDoc = await eventsModel.findOne({ _id: eventID });

				var updatedNewTeams = [];

				for (let i = 0; i < newTeams.length; i++) {
					const newTeam = newTeams[i];
					const existingParticipants = await DBUtils.getEntities(participantsModel, {
						eventID: eventID,
					});
					var existingParticipantEmails = [];

					var existingUserIds = existingParticipants.map(
						(participant) => participant.userID
					);

					var userDocs = await usersModel
						.find({
							_id: {
								$in: existingUserIds,
							},
						})
						.exec();

					var existingParticipantEmails = userDocs.map((userDoc) => userDoc.email);

					// const arr4 = await existingParticipants.map(async (participant) => {
					// 	const user = await DBUtils.getEntity(usersModel, {
					// 		_id: participant.userID,
					// 	});

					// 	// existingParticipantEmails.push(user.email);
					// 	return user.email

					// });
					// await Promise.all(arr4);
					// console.log(existingParticipantEmails, "existingParticipantEmails");
					const participantAlreadyExists = newTeam.filter((member) =>
						existingParticipantEmails.includes(member.email)
					).length;
					// console.log(
					// 	participantAlreadyExists,
					// 	newTeam.filter((member) =>
					// 		existingParticipantEmails.includes(member.email)
					// 	),
					// 	"participantAlreadyExists"
					// );
					if (participantAlreadyExists) {
						unregisteredTeamIDs.push(newTeam[0].teamID);
						const memberWhoseTeammatesHaveAlreadyRegistered = newTeam.filter(
							(member) => !existingParticipantEmails.includes(member.email)
						);
						const memberWhoseTeammatesHaveAlreadyRegisteredEmails = memberWhoseTeammatesHaveAlreadyRegistered.map(
							(member) => member.email
						);

						logger.info(
							`send mail to ${memberWhoseTeammatesHaveAlreadyRegisteredEmails}`
						);

						if (memberWhoseTeammatesHaveAlreadyRegisteredEmails.length) {
							memberWhoseTeammatesHaveAlreadyRegisteredEmails.map(async (email) => {
								if (!eventDoc.ignoredTeamRegistrationEmails.includes(email)) {
									sendMailForUnsuccessfulTeamRegistration(
										email,
										eventDoc.name,
										eventDoc.displayName
									);

									//send the mail mentioning one or more participants of your team have already registered
									eventDoc.ignoredTeamRegistrationEmails.push(email);
								}
							});
							await eventDoc.save();
						}
					} else {
						updatedNewTeams.push(newTeam);
					}
				}

				// const onePromise = await Promise.all(arr);
				// await onePromise.then(() => {
				// 	// console.log(updatedNewTeams, "updatedNewTeams2")
				// });

				// teamRegister({eventID: eventID, body: {}})

				for (let i = 0; i < updatedNewTeams.length; i++) {
					// updatedNewTeams.map(async (team) => {
					const team = updatedNewTeams[i];
					await teamRegister(
						eventID,
						team
						// {
						// 	source: leaderUser.source,
						// 	stream: leaderUser.stream,
						// }
					);
				}
				// console.log(newTeams, "newTeams");
				// console.log(updatedNewTeams, "updatedNewTeams")
				// console.log(unregisteredTeamIDs, " unregisteredTeamIDs");

				// const somePromise = await Promise.all(updatedNewTeams);
				// console.log(somePromise, "somePromise");
				// await somePromise.then(() => {
				// 	console.log("done34567");
				// 	// registerParticipantsThroughCSV(req, res);
				// });
				// await DBUtils.bulkInsertEntities(userModel, updatedCSVUsers);
				if (unregisteredTeamIDs.length) {
					process500(
						res,

						`Only some teams could be registered. Teams with following teamIDs were not registered as one or more of the team memebers have already registered for the event ${unregisteredTeamIDs}`
					);
				} else processData(res, { msg: "All teams were registered successfully " });
			} else {
				// const existingParticipantEmails = await DBUtils.getAllEntities(participantsModel, {eventID: eventID});

				for (let i = 0; i < validCSVParticipants.length; i++) {
					const participant = validCSVParticipants[i];
					// const arr3 = validCSVParticipants.map(async (participant) => {
					const existingParticipants = await DBUtils.getEntities(participantsModel, {
						eventID: eventID,
					});
					const existingParticipantEmails = await existingParticipants.map(
						async (participant) => {
							const user = await DBUtils.getEntity(usersModel, {
								_id: participant.userID,
							});

							return user.email;
						}
					);

					const isAlreadyRegistered = existingParticipantEmails.includes(
						participant.email
					);

					if (isAlreadyRegistered) {
						// alreadyRegisteredParticipants.push(participant)
						//Send the mail if required
						return;
					} else {
						// const user = users.filter((user) => user.email === participant.email)[0];
						// console.log(
						// 	eventID,
						// 	user.summitID,
						// 	participant.source,
						// 	participant.stream,
						// 	"check"
						// );
						soloRegister(eventID, {
							...participant,
							source: participant.source,
							stream: participant.stream,
						});
					}
				}

				// const aPromise = await Promise.all(arr3);

				processData(res, { msg: "Participants registered" });
				// console.log(
				// 	successfullyRegisteredParticipants.length,
				// 	"successfullyRegisteredParticipants"
				// );
				console.log(incomingEmails.length, "successfullyRegisteredParticipants");
				console.log(
					successfullyRegisteredParticipantEmails.length,
					"successfullyRegisteredParticipantEmails"
				);
				console.log(alreadyRegisteredEmails.length, "alreadyRegisteredEmails");
				var notRegisteredEmails = [];
				for (i = 0; i < incomingEmails.length; i++) {
					if (
						!(
							successfullyRegisteredParticipantEmails.includes(incomingEmails[i]) ||
							alreadyRegisteredEmails.includes(incomingEmails[i])
						)
					) {
						notRegisteredEmails.push(incomingEmails[i]);
					}
				}
				console.log("notRegisteredEmails : ", notRegisteredEmails);
			}
		};

		const register = async (newUser, res) => {
			try {
				// console.log(newUser, "newUser");

				const existingUsers = await DBUtils.getAllEntities(usersModel);
				const existingUserEmails = existingUsers.map((user) => user.email);

				const userAlreadyExists = existingUserEmails.includes(newUser.email);

				if (userAlreadyExists) {
					return false;
				} else {
					const password = makeid(6);
					// console.log(password, "input password");
					const hashedPassword = await bcrypt.hash(password, 10);
					// console.log(password, hashedPassword, "password");
					const user = new usersModel({
						...newUser,
						email: newUser.email.toLowerCase(),
						password: hashedPassword,
					});

					// Get Summit ID from count
					// var { count } = await usersModel.collection.stats();
					// console.log(count, "count");
					user.summitID = getSummitID();
					// console.log(user.summitID, "summitID");

					await user.save();

					// console.log(
					// 	await DBUtils.getEntity(usersModel, { summitID: user.summitID }),
					// 	"check2"
					// );
					return password;
				}

				// processData(res, "registered");
			} catch (error) {
				// console.log(error);
				if (error.code === 11000) {
					const dupSummitID = !!error.keyValue.summitID && error.keyValue.summitID;
					const dupPhone = !!error.keyValue.phone && error.keyValue.phone;
					if (dupSummitID) {
						logger.error(
							`Duplicate ID ${dupSummitID} detected. Probably a result of race condition. Re-registering...`
						);
						await register(newUser, res);
					}
					if (dupPhone) {
						logger.error(
							`Duplicate ID ${dupPhone} detected. Probably a result of Badluck. Re-registering...`
						);
						num = parseInt(newUser.phone) + parseInt(Math.random() * 10);
						newPhoneNumber = num.toString();
						newUser.phone = newPhoneNumber;
						await register(newUser, res);
					}
				} else {
					console.log(error);
				}
			}
		};

		await registerParticipantsThroughCSV();

		// registerUsersThroughCSV(req, res, (newCSVUsers) => {
		// 	const arr = newCSVUsers.map((user) => {
		// 		// return register(user);
		// 	});
		// 	console.log(arr, "fhjhuhiiugytf");
		// 	const somePromise = Promise.all(arr);
		// 	somePromise.then(() => {
		// 		console.log("done34567");
		// 		// registerParticipantsThroughCSV(req, res);
		// 	});
		// });
	} catch (error) {
		console.log(error);
		if (error.message === "Not authorized") {
			process401(res, error);
			return;
		}
		process500(res, error.message);
	}
};

// exports.registerParticipantsThroughCSV = (req, res) => {

// }

exports.promoteParticipants = async (req, res) => {
	try {
		const { adminID } = verifyRequest(req.headers.cookie);

		try {
			const { promotedIDs, maxRound, eventID } = req.body;
			//console.log(promotedIDs, "promotedIDs");

			promotedIDs.map(async (promotedID) => {
				//console.log(promotedID, "promotedID");
				const promotedParticipant = await DBUtils.getEntity(participantsModel, {
					_id: promotedID,
				});
				//console.log(promotedParticipant, "promotedParticipant");

				await DBUtils.updateEntity(
					participantsModel,
					{ _id: promotedID },
					{ round: promotedParticipant.round + 1 }
				);
			});

			await DBUtils.updateEntity(eventsModel, { _id: eventID }, { round: maxRound + 1 });

			processData(res, "Successfully promoted!");
		} catch (error) {
			console.log(error);
			process500(res, error.message ? error.message : error);
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

exports.toggleEventStatus = async (req, res) => {
	try {
		const { adminID } = verifyRequest(req.headers.cookie);

		try {
			const { eventID } = req.body;
			//console.log(eventID, "eventID");

			// promotedIDs.map(async (promotedID) => {
			// 	console.log(promotedID, "promotedID");
			// 	const promotedParticipant = await DBUtils.getEntity(participantsModel, {
			// 		_id: promotedID,
			// 	});
			// 	console.log(promotedParticipant, "promotedParticipant");

			// 	await DBUtils.updateEntity(
			// 		participantsModel,
			// 		{ _id: promotedID },
			// 		{ round: promotedParticipant.round + 1 }
			// 	);
			// });

			const event = await DBUtils.getEntity(eventsModel, { _id: eventID });

			const updatedIsLive = !event.isLive;

			await DBUtils.updateEntity(eventsModel, { _id: eventID }, { isLive: updatedIsLive });

			processData(res, {
				msg: updatedIsLive
					? ` ${event.name} is live now`
					: ` ${event.name} is not live now`,
				isLive: updatedIsLive,
			});
		} catch (error) {
			console.log(error);
			process500(res, error.message ? error.message : error);
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
