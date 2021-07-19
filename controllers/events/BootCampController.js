const mongoose = require("mongoose");
const express = require("express");

const eventsModel = require("../../models/events.model");
const usersModel = require("../../models/users.model");
const participantsModel = require("../../models/participants.model");

const logger = require("../../utils/LoggerUtils");
const { process500, process400, processData } = require("../../utils/ResponseUtils");
const verifyRequest = require("../../utils/VerifyRequest");

const ESUMMIT_SECRET =
	"e2af6c9bccc5ecdd6b56dd1bfe0171894ba66357b1079c9b3dead6575f291a2287703d70358018f1e5624378c669c8d390bad03692d2f832090069d73e558590";

/**
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
const bootcampSubmit = async (req, res) => {
	const { round } = req.params;
	const { _id: leaderUserID } = verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);
	const { _id: bootcampID } = await eventsModel.findOne({ name: "bootcamp" });

	try {
		await participantsModel
			.updateOne(
				{ userID: leaderUserID, eventID: bootcampID },
				{
					$addToSet: {
						submissions: {
							round: 1,
							submissionType: "object",
							name: "questionnaire",
							submission: req.body,
							timestamp: Date.now(),
						},
					},
				}
			)
			.exec();

		processData(res, "Submitted successfully");
	} catch (e) {
		process500(e.message);
		console.log(e);
	}
	res.end();
};

module.exports = bootcampSubmit;
