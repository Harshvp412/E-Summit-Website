const Rzp = require("razorpay");
const razorpay = require("../config/razorpayConfig");

const usersModel = require("../models/users.model");
const eventModel = require("../models/events.model");
const participantsModel = require("../models/participants.model");
const workshopOrdersModel = require("../models/workshopOrders.model");
const eventPassModel = require("../models/eventPass.model");
const ordersModel = require("../models/orders.model");

const logger = require("../utils/LoggerUtils");

const eventFees = {
	elevate: 499,
	"biz-quiz": 150,
};

const createOrder = async (req, res) => {
	const { event } = req.params;

	try {
		const options = {
			amount: eventFees[event] * 100,
			currency: "INR",
			notes: {
				registrationInfo: JSON.stringify({
					...req.body,
					event,
					linkedInURL:
						req.body.linkedInURL &&
						req.body.linkedInURL
							.split("/")
							.filter((w) => w !== "")
							.pop(),
				}),
			},
		};
		let order = await razorpay.orders.create(options);
		if (order) {
			logger.info("Order generated", order);
			res.json(order);
		} else {
			res.json({ error: "Subscription could not be added" });
		}
	} catch (err) {
		console.log(err);
		res.json({ error: "Error occured while adding subscription" });
	}
};

// eslint-disable-next-line no-unused-vars
const verifyPayment = async (req, res) => {
	const secret = "6%}x9q#^w/]ad3r";
	const reqSignature = req.headers["x-razorpay-signature"];

	const isSignatureValid = Rzp.validateWebhookSignature(req.rawBody, reqSignature, secret);

	if (isSignatureValid) {
		const paymentID = req.body.payload.payment.entity.id;
		const { registrationInfo } = req.body.payload.payment.entity.notes;
		const parsedInfo = JSON.parse(registrationInfo);

		const { event: eventName, summitID, linkedInURL, registrationDetails } = parsedInfo;
		const userDoc = await usersModel.findOne({ summitID }).exec();
		const eventDoc = await eventModel.findOne({ name: eventName }).exec();

		if (req.body.event === "payment.authorized") {
			try {
				const participantDoc = new participantsModel({
					userID: userDoc._id,
					eventID: eventDoc._id,
					round: 1,
					registrationDetails,
					paymentDetails: {
						paymentID,
						captured: false,
					},
				});
				await participantDoc.save();

				userDoc.linkedInURL = linkedInURL;
				await userDoc.save();

				logger.info("Saved Elevate participant", parsedInfo);
				res.json({ status: "ok" });
			} catch (err) {
				console.log(err);
			}
		}
		if (req.body.event === "payment.captured") {
			try {
				const participant = await participantsModel
					.findOne({
						userID: userDoc._id,
						eventID: eventDoc._id,
					})
					.exec();

				participant.paymentDetails.captured = true;
				await participant.save();

				userDoc.participatedEvents.push(eventDoc._id);
				await userDoc.save();

				eventDoc.participants.push(participant._id);
				await eventDoc.save();

				logger.info("Payment Captured for participant", participant);
				res.json({ status: "ok" });
			} catch (error) {
				console.log(error);
			}
		}
	} else {
		res.json({ status: "ok" });
	}
};

const capturePayment = async (req, res) => {
	const secret = "Y.C8AN:Djy@|4.3";
	const reqSignature = req.headers["x-razorpay-signature"];

	const isSignatureValid = Rzp.validateWebhookSignature(req.rawBody, reqSignature, secret);

	if (isSignatureValid) {
		const paymentID = req.body.payload.payment.entity.id;

		if (req.body.event === "payment.captured") {
			try {
				const updatedWorkshopOrders = await workshopOrdersModel.updateOne(
					{ "paymentDetails.paymentID": paymentID },
					{ $set: { "paymentDetails.captured": true } }
				);
				if (updatedWorkshopOrders.nModified > 0) {
					res.json({ status: "ok" });
					logger.info("Payment Captured for payment", paymentID);
					return;
				}
				const updatedEventPassOrders = await eventPassModel.updateMany(
					{ "paymentDetails.paymentID": paymentID },
					{ $set: { "paymentDetails.captured": true } }
				);
				if (updatedEventPassOrders.nModified > 0) {
					res.json({ status: "ok" });
					logger.info("Payment Captured for payment", paymentID);
					return;
				}
				const updatedParticipantsModel = await participantsModel.updateMany(
					{ "paymentDetails.paymentID": paymentID },
					{ $set: { "paymentDetails.captured": true } }
				);
				if (updatedParticipantsModel.nModified > 0) {
					res.json({ status: "ok" });
					logger.info("Payment Captured for payment", paymentID);
					return;
				}
			} catch (error) {
				console.log(error);
			}
		}
	} else {
		res.json({ status: "ok" });
	}
};
const captureShopPayment = async (req, res) => {
	const secret = "b6AkPF~OO0IuBV*";
	const reqSignature = req.headers["x-razorpay-signature"];

	const isSignatureValid = Rzp.validateWebhookSignature(req.rawBody, reqSignature, secret);

	if (isSignatureValid) {
		const paymentID = req.body.payload.payment.entity.id;

		if (req.body.event === "payment.captured") {
			try {
				const updatedOrder = await ordersModel.updateOne(
					{ "paymentDetails.paymentID": paymentID },
					{ $set: { "paymentDetails.captured": true } }
				);
				if (updatedOrder.nModified > 0) {
					logger.info("Payment Captured for payment", paymentID);
				}
				res.json({ status: "ok" });
			} catch (error) {
				console.log(error);
			}
		}
	} else {
		res.json({ status: "ok" });
	}
};

module.exports = { createOrder, capturePayment, captureShopPayment };
