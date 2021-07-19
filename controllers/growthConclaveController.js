const Rzp = require("razorpay");
const razorpay = require("../config/razorpayConfig");

const usersModel = require("../models/users.model");
const workshopsModel = require("../models/workshops.model");
const referralsModel = require("../models/referrals.model");
const { processData, process500 } = require("../utils/ResponseUtils");

const verifyRequest = require("../utils/VerifyRequest");
const logger = require("../utils/LoggerUtils");
const workshopOrdersModel = require("../models/workshopOrders.model");
const { verify, sign: signJWT } = require("jsonwebtoken");

const ESUMMIT_SECRET =
	"e2af6c9bccc5ecdd6b56dd1bfe0171894ba66357b1079c9b3dead6575f291a2287703d70358018f1e5624378c669c8d390bad03692d2f832090069d73e558590";

const itemAmounts = {
	"fin-combo": 799,
	"pm-combo": 599,
	"wizard-combo": 899,
	"machine-learning-artificial-intelligence": 799,
	"android-app-development": 499,
	cryptocurrency: 499,
	"stock-market-investing": 499,
	"strategic-planning": 299,
	"design-thinking": 299,
	"introduction-to-product-management": 499,
	"growth-hacks": 0,
	"investor-relations": 0,
	"effective-capital-management": 0,
};

exports.verify = async (req, res) => {
	const { summitID } = verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);
	const { separateWorkshopKeys, referralCode, couponCode, comboWorkshopKeys } = req.body;

	const errors = {};
	const meta = {};

	try {
		const userDoc = await usersModel.findOne({ summitID }).exec();
		const allWorkshopKeys = [...separateWorkshopKeys, ...comboWorkshopKeys];

		const workshopsAlreadyRegisteredFor = userDoc.registeredWorkshops.filter((workshopKey) =>
			allWorkshopKeys.includes(workshopKey)
		);

		if (workshopsAlreadyRegisteredFor.length > 0) {
			errors.summitID = {
				type: "validate",
				message:
					"You have already registered for some of the workshops with this Summit ID.",
			};
			meta.workshopsAlreadyRegisteredFor = workshopsAlreadyRegisteredFor;
		}

		// eslint-disable-next-line no-inner-declarations
		async function validateCouponCode(code) {
			if (!userDoc.email.endsWith("@smail.iitm.ac.in")) {
				return "Sorry, it looks like you are not eligible to redeem this coupon code.";
			}
			if (code !== "IITM50") {
				return "Invalid Coupon Code";
			}

			const workshopDocs = await workshopsModel
				.find({ key: { $in: separateWorkshopKeys } })
				.exec();
			const couponsRedeemedCount = workshopDocs.reduce((obj, { key, couponsRedeemed }) => {
				obj[key] = couponsRedeemed;
				return obj;
			}, {});

			const couponsExhaustedFor = separateWorkshopKeys.filter(
				(key) => couponsRedeemedCount[key] >= 50
			);

			meta.couponsExhaustedFor = couponsExhaustedFor;
			if (couponsExhaustedFor.length > 0) {
				return "Some of the workshops have exhausted their limit of 50. You'll have to pay for these.";
			}

			return null;
		}

		if (couponCode) {
			const couponCodeErrorMessage = await validateCouponCode(couponCode);
			if (couponCodeErrorMessage !== null) {
				errors.couponCode = {
					type: "validate",
					message: couponCodeErrorMessage,
				};
			}
		}

		if (referralCode) {
			const referralCodeExists = await referralsModel.findOne({ referralCode }).exec();
			if (!referralCodeExists) {
				errors.referralCode = {
					type: "validate",
					message: "Invalid referral Code",
				};
			}
		}

		processData(res, { errors, meta });
	} catch (error) {
		logger.error(error.message);
		console.log(error);
		process500(res);
	}
};

exports.createOrder = async (req, res) => {
	const { items, referralCode, couponRedeemedFor } = req.body;

	const amount = items.reduce((acc, key) => {
		const thisPrice = couponRedeemedFor.includes(key) ? 0 : itemAmounts[key];
		return acc + thisPrice;
	}, 0);

	try {
		const options = {
			amount: amount * 100 * (referralCode ? 0.9 : 1),
			currency: "INR",
			// notes,
		};
		let order = await razorpay.orders.create(options);
		if (order) {
			const orderOptions = {
				name: "Growth Conclave | E-Summit IITM",
				description: "Workshop Registration",

				key: order.key,
				order_id: order.id,
				amount: order.amount,
				currency: order.currency,
				notes: order.notes,
			};
			logger.info("Workshop Order generated.", { order });
			res.json(orderOptions);
		} else {
			res.json({ error: "Subscription could not be added" });
		}
	} catch (err) {
		console.log(err);
		res.json({ error: "Error occured while adding subscription" });
	}
};

exports.catchPaymentAndRegister = async (req, res) => {
	const secret = "B%wIF9wmhbNyb~F";
	const reqSignature = req.headers["x-razorpay-signature"];

	const isSignatureValid = Rzp.validateWebhookSignature(req.rawBody, reqSignature, secret);

	console.log("Hello from GC handler");

	if (isSignatureValid) {
		const paymentID = req.body.payload.payment.entity.id;
		const {
			summitID,
			items,
			allWorkshopKeys: allWorkshopKeysSerialized,
			couponRedeemedFor,
			referralCode,
			totalPrice,
		} = req.body.payload.payment.entity.notes;
		const parsedRegistrationInfo = {
			summitID,
			items: JSON.parse(items),
			allWorkshopKeys: JSON.parse(allWorkshopKeysSerialized),
			couponRedeemedFor: JSON.parse(couponRedeemedFor),
			referralCode,
			totalPrice: parseFloat(totalPrice),
		};

		const { allWorkshopKeys, ...orderDetails } = parsedRegistrationInfo;

		if (req.body.event === "payment.authorized") {
			try {
				const orderDoc = new workshopOrdersModel({
					...orderDetails,
					paymentDetails: {
						paymentID,
						captured: false,
					},
				});
				await orderDoc.save();

				logger.info("Saved Workshop order", parsedRegistrationInfo);
				res.json({ status: "ok" });
			} catch (err) {
				console.log(err);
			}
		}
		if (req.body.event === "payment.captured") {
			try {
				await workshopsModel
					.updateMany(
						{ key: { $in: allWorkshopKeys } },
						{ $addToSet: { registrants: orderDetails.summitID } }
					)
					.exec();
				await usersModel
					.updateOne(
						{ summitID: orderDetails.summitID },
						{ $addToSet: { registeredWorkshops: { $each: allWorkshopKeys } } }
					)
					.exec();
				if (orderDetails.referralCode) {
					await referralsModel
						.updateOne(
							{ referralCode: orderDetails.referralCode },
							{ $inc: { workshopRedeemCount: 1 } }
						)
						.exec();
				}
				if (orderDetails.couponRedeemedFor.length > 0) {
					await workshopsModel
						.updateMany(
							{ key: { $in: orderDetails.couponRedeemedFor } },
							{ $inc: { couponsRedeemed: 1 } }
						)
						.exec();
				}

				await workshopOrdersModel
					.updateOne(
						{ "paymentDetails.paymentID": paymentID },
						{ "paymentDetails.captured": true }
					)
					.exec();

				logger.info("Payment Captured for workshop order", paymentID);
				res.json({ status: "ok" });
			} catch (error) {
				console.log(error);
			}
		}
	} else {
		res.json({ status: "ok" });
	}
};

exports.register = async (req, res) => {
	try {
		const { allWorkshopKeys, paymentID, ...orderDetails } = req.body;
		verifyRequest(req, "ESUMMIT_IITM_AUTH_TOKEN", ESUMMIT_SECRET);
		const orderDoc = new workshopOrdersModel({
			...orderDetails,
			paymentDetails: {
				paymentID,
				captured: false,
			},
		});
		await orderDoc.save();

		await workshopsModel
			.updateMany(
				{ key: { $in: allWorkshopKeys } },
				{ $addToSet: { registrants: orderDetails.summitID } }
			)
			.exec();
		await usersModel
			.updateOne(
				{ summitID: orderDetails.summitID },
				{ $addToSet: { registeredWorkshops: { $each: allWorkshopKeys } } }
			)
			.exec();
		if (orderDetails.referralCode) {
			await referralsModel
				.updateOne(
					{ referralCode: orderDetails.referralCode },
					{ $inc: { workshopRedeemCount: 1 } }
				)
				.exec();
		}
		if (orderDetails.couponRedeemedFor.length > 0) {
			await workshopsModel
				.updateMany(
					{ key: { $in: orderDetails.couponRedeemedFor } },
					{ $inc: { couponsRedeemed: 1 } }
				)
				.exec();
		}
		logger.info("Saved Workshop order", orderDoc.toObject());
		processData(res, "Saved Workshop order");
	} catch (error) {
		logger.error(error.message);
		console.log(error);
		process500(res);
	}
};

exports.getAllWorkshopsStats = async (req, res) => {
	try {
		verify(req.headers.authorization.split(" ")[1], ESUMMIT_SECRET);
		const allWorkshopStats = await workshopsModel
			.aggregate([
				{
					$project: {
						topic: 1,
						nRegistrants: { $size: "$registrants" },
						couponsRedeemed: 1,
					},
				},
			])
			.exec();

		processData(res, allWorkshopStats);
	} catch (error) {
		console.log(error);
		process500(res, error);
	}
};

exports.getComboRegistrants = async (req, res) => {
	try {
		const { key } = req.params;
		verify(req.headers.authorization.split(" ")[1], ESUMMIT_SECRET);

		const registrants = await workshopOrdersModel
			.find({ items: { $elemMatch: { $in: [key] } } })
			.exec();
		const userData = await usersModel
			.find(
				{ summitID: { $in: registrants.map(({ summitID }) => summitID) } },
				{ summitID: 1, name: 1, email: 1, phone: 1, _id: 0 }
			)
			.exec();

		processData(res, userData);
	} catch (error) {
		console.log(error);
		process500(res, error);
	}
};
exports.getWorkshopRegistrants = async (req, res) => {
	try {
		const { key } = req.params;
		verify(req.headers.authorization.split(" ")[1], ESUMMIT_SECRET);
		const workshop = await workshopsModel.findOne({ key }).exec();

		const itemKeys = [key];

		if (key === "introduction-to-product-management" || key === "design-thinking") {
			itemKeys.push("pm-combo", "wizard-combo");
		}
		if (key === "strategic-planning") {
			itemKeys.push("wizard-combo");
		}
		if (key === "stock-market-investing" || key === "cryptocurrency") {
			itemKeys.push("fin-combo");
		}

		const paidUsers = await workshopOrdersModel
			.distinct("summitID", {
				"paymentDetails.paymentID": { $regex: /^pay_.{14}$/ },
				items: { $elemMatch: { $in: itemKeys } },
			})
			.exec();

		const userData = await usersModel.find({ summitID: { $in: workshop.registrants } }).exec();
		const filteredUserData = userData.map(({ summitID, name, email, phone }) => ({
			summitID,
			name,
			email,
			phone,
			paid: paidUsers.includes(summitID),
		}));
		processData(res, filteredUserData);
	} catch (error) {
		console.log(error);
		process500(res, error);
	}
};

exports.getUniqueWorkshopRegistrants = async (req, res) => {
	try {
		const { key } = req.params;
		verify(req.headers.authorization.split(" ")[1], ESUMMIT_SECRET);

		const uniqueRegistrants = await workshopOrdersModel.find({ items: [key] }).exec();
		const multipleOrders = uniqueRegistrants
			.filter(
				({ summitID }, i, a) =>
					a.findIndex(({ summitID: _summitID }) => summitID === _summitID) !== i
			)
			.map(({ summitID }) => summitID);

		const finalUniqueRegistrants = uniqueRegistrants
			.filter(({ summitID }) => !multipleOrders.includes(summitID))
			.map(({ summitID }) => summitID);

		const userData = await usersModel
			.find({ summitID: { $in: finalUniqueRegistrants } })
			.exec();
		const filteredUserData = userData.map(({ summitID, name, email, phone }) => ({
			summitID,
			name,
			email,
			phone,
			paid: uniqueRegistrants.includes(summitID),
		}));
		processData(res, filteredUserData);
	} catch (error) {
		console.log(error);
		process500(res, error);
	}
};

exports.adminLogin = async (req, res) => {
	const password = req.body.password;
	try {
		if (password === "prettychill") {
			const signedToken = signJWT("esummit-admin-growth-conclave", ESUMMIT_SECRET);
			res.status(200).json({ data: { signedToken } });
		} else {
			res.status(401).json({ data: { msg: "wrong_password" } });
		}
	} catch (error) {
		console.log(error);
		process500(res, error);
	}
};

exports.adminLogout = async (req, res) => {
	try {
		verify(req.headers.authorization.split(" ")[1], ESUMMIT_SECRET);
		processData(res, "Logged out");
	} catch (err) {
		process500(res, err.message ? err.message : err);
	}
};
