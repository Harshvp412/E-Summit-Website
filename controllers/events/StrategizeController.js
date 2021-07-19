const mongoose = require("mongoose");
const express = require("express");

const eventsModel = require("../../models/events.model");
const usersModel = require("../../models/users.model");
const participantsModel = require("../../models/participants.model");

const logger = require("../../utils/LoggerUtils");
const { process500, process400, processData } = require("../../utils/ResponseUtils");
const verifyRequest = require("../../utils/VerifyRequest");
const { S3SignedPolicy } = require("../../utils/S3ClientUploader");

const ESUMMIT_SECRET =
	"e2af6c9bccc5ecdd6b56dd1bfe0171894ba66357b1079c9b3dead6575f291a2287703d70358018f1e5624378c669c8d390bad03692d2f832090069d73e558590";

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const strategizeSubmit = async (req, res) => {
	console.log(req.body.url);
	const { round } = req.params;
	const { _id: leaderUserID } = verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);
	const { _id: strategizeID } = await eventsModel.findOne({ name: "strategize" });

	try {
		await participantsModel
			.updateOne(
				{ userID: leaderUserID, eventID: strategizeID },
				{
					$addToSet: {
						submissions: {
							round: round,
							submissionType: "url",
							name: "pitchDeck",
							submission: req.body.url,
							timestamp: Date.now(),
						},
					},
				}
			)
			.exec();

		console.log({
			round: 1,
			submissionType: "url",
			name: "pitchDeck",
			submission: req.body.url,
			timestamp: Date.now(),
		});
		processData(res, "Submitted successfully");
	} catch (e) {
		process500(e.message);
		console.log(e);
	}
	res.end();
};

// const unconferenceChoiceSubmit = async (req, res) => {
//     console.log(req.body)
// 	const { round } = req.params;
// 	const { _id: leaderUserID } = verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);
// 	const { _id: unconferenceID } = await eventsModel.findOne({ name: "unconference" });

// 	try {
// 		await participantsModel
// 			.updateOne(
// 				{ userID: leaderUserID, eventID: unconferenceID },
// 				{

// 						$set : { "registrationDetails.caseStudy" : req.body.caseStudy
//                     }

// 				}
// 			)
// 			.exec();

// 		processData(res, "Submitted successfully");
// 	} catch (e) {

//         console.log(e, "e");
//         process500(e.message);
// 	}
// 	res.end();
// };

const getS3SignedPolicy = async (req, res) => {
	try {
		const { _id: leaderUserID } = verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);

		const signedPolicy = new S3SignedPolicy(req.params.bucketName);
		processData(res, signedPolicy);
	} catch (error) {
		process500(res, error.message);
	}
};

module.exports = { strategizeSubmit, getS3SignedPolicy };
