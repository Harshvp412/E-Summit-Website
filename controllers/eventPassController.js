const Rzp = require("razorpay");
const razorpay = require("../config/razorpayConfig");

const eventPassModel = require("../models/eventPass.model");
const referralsModel = require("../models/referrals.model");

const logger = require("../utils/LoggerUtils");
const verifyRequest = require("../utils/VerifyRequest");
const { processData, process400, process500 } = require("../utils/ResponseUtils");

const ESUMMIT_SECRET =
	"e2af6c9bccc5ecdd6b56dd1bfe0171894ba66357b1079c9b3dead6575f291a2287703d70358018f1e5624378c669c8d390bad03692d2f832090069d73e558590";

const methodAmounts = {
	single: 199,
	combo: 449,
};

async function validateCouponCode(code, userEmail) {
	if (!userEmail.endsWith("@smail.iitm.ac.in")) {
		return "Sorry, it looks like you are not eligible to redeem this coupon code.";
	}
	if (code !== "E-SUMMIT300") {
		return "Invalid Coupon Code";
	}

	const agg = await eventPassModel.aggregate([
		{ $match: { couponRedeemed: true } },
		{ $count: "couponsRedeemedCount" },
	]);
	if (agg.length > 0 && agg[0].couponsRedeemedCount >= 350) {
		return "Early birds get the worm! 50 coupons have been used already.";
	}

	return null;
}

const verifyRegistration = async (req, res) => {
	try {
		verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);
		const { summitIDs, referralCode, couponCode } = req.body;
		const { ESUMMIT_IITM_USER_EMAIL_ID: userEmail } = req.cookies;

		let referralCodeValid;

		const existingEventPasses = await eventPassModel
			.distinct("summitID", { summitID: { $in: summitIDs } })
			.exec();

		if (existingEventPasses.length > 0) {
			process400(res, "You have already registered for E-Summit Event Pass.");
			return;
		}

		if (couponCode) {
			const couponCodeErrorMessage = await validateCouponCode(couponCode, userEmail);
			if (couponCodeErrorMessage !== null) {
				process400(res, couponCodeErrorMessage);
				return;
			}
		}

		if (referralCode) {
			const referralCodeExists = await referralsModel.findOne({ referralCode }).exec();
			if (!referralCodeExists) {
				process400(res, "Invalid referral Code");
				return;
			} else {
				referralCodeValid = referralCodeExists;
			}
		}

		processData(res, referralCode ? { referralCodeValid } : "No Errors");
	} catch (error) {
		logger.error(error.message);
		console.log(error);
		process500(res);
	}
};

const createOrder = async (req, res) => {
	const { method, isReferralCodeValid } = req.body;

	const amount = methodAmounts[method] * 100 * (isReferralCodeValid ? 0.9 : 1);
	try {
		const options = { amount, currency: "INR" };
		let order = await razorpay.orders.create(options);

		if (order) {
			const orderOptions = {
				key: order.key,
				order_id: order.id,
				amount: order.amount,
				currency: order.currency,
				notes: order.notes,

				name: "E-Summit Event Pass",
				description: "One Pass for All",
				theme: { color: "#222222" },
			};
			logger.info("Order generated", order.notes);
			res.json(orderOptions);
		} else {
			res.json({ error: "Subscription could not be added" });
		}
	} catch (err) {
		console.log(err);
		res.json({ error: "Error occured while adding subscription" });
	}
};

const register = async (req, res) => {
	try {
		const { summitIDs, paymentID, ...commonData } = req.body;

		const eventPassDocs = summitIDs.map((summitID) => ({
			summitID,
			...commonData,
			paymentDetails: {
				paymentID,
				captured: false,
			},
		}));

		await eventPassModel.create(eventPassDocs);
		if (commonData.referralCode) {
			await referralsModel
				.updateOne(
					{ referralCode: commonData.referralCode },
					{ $inc: { eventPassRedeemCount: 1 } }
				)
				.exec();
		}
		processData(res);
	} catch (error) {
		console.log(error);
		process500(res, error.message);
	}
};

// !Wrong code : Dont use
// eslint-disable-next-line no-unused-vars
const catchPaymentAndRegister = async (req, res) => {
	const secret = "vF&B:%yg[p:%~Nv";
	const reqSignature = req.headers["x-razorpay-signature"];

	const isSignatureValid = Rzp.validateWebhookSignature(req.rawBody, reqSignature, secret);

	console.log("Hello from Event Pass handler");

	if (isSignatureValid) {
		const paymentID = req.body.payload.payment.entity.id;
		const { notes } = req.body.payload.payment.entity;

		if (req.body.event === "payment.authorized") {
			try {
				await register(
					{
						...notes,
						summitIDs: JSON.parse(notes.summitIDs),
					},
					paymentID
				);
				logger.info("Issued E-Summit Pass");
				res.json({ status: "ok" });
			} catch (err) {
				console.log(err);
			}
		}
		if (req.body.event === "payment.captured") {
			try {
				await eventPassModel
					.updateMany(
						{ "paymentDetails.paymentID": paymentID },
						{ "paymentDetails.captured": true }
					)
					.exec();

				logger.info("Payment Captured for Event Pass");
				res.json({ status: "ok" });
			} catch (error) {
				console.log(error);
			}
		}
	} else {
		res.json({ status: "ok" });
	}
};

module.exports = {
	createOrder,
	register,
	verifyRegistration,
};
