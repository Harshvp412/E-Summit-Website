const Razorpay = require("razorpay");

const Order = require("../models/orders.model");
const Product = require("../models/products.model");

const logger = require("../utils/LoggerUtils");
const { processData, process500 } = require("../utils/ResponseUtils");
const { sendShopOrderSuccessMail } = require("../utils/EmailUtils");

// Test Keys
// const razorpay = new Razorpay({
// key_id: "rzp_test_1ElIwyJOBGkNxA",
// key_secret: "BlX03U3AA0BDCFuvnd8gt2Lo",
// });

// Live Keys
const razorpay = new Razorpay({
	key_id: "rzp_live_6E3AUBDJbO0QlG",
	key_secret: "IF1w0rIwWmHtkg8xHIzLoGtS",
});

const productNames = {
	tee1: "Iron Man Tee(s)",
	tee2: "Loading Success Tee(s)",
	combo: "Tee Combo(s)",
};

const productPrices = {
	tee1: 400,
	tee2: 350,
	combo: 600,
};

const getProducts = async (req, res) => {
	try {
		const [tee1Doc, tee2Doc] = await Product.find().sort("key").exec();
		processData(res, { tee1: tee1Doc.stock, tee2: tee2Doc.stock });
	} catch (error) {
		console.log(error);
		process500(res, error);
	}
};

const createOrder = async (req, res) => {
	let { items } = req.body;

	const amount = items.reduce((acc, itemID) => {
		const [key, , quantity] = itemID.split("-");
		return acc + parseInt(quantity) * productPrices[key];
	}, 0);

	// const notes = { items, totalPrice: amount };

	// for (const key in notes) {
	// 	const element = notes[key];
	// 	if (typeof element !== "string") {
	// 		notes[key] = JSON.stringify(element);
	// 	}
	// }

	try {
		const options = {
			amount: amount * 100,
			currency: "INR",
			// notes,
		};
		const order = await razorpay.orders.create(options);
		if (order) {
			const orderOptions = {
				key: order.key,
				order_id: order.id,
				amount: order.amount,
				currency: order.currency,
				notes: order.notes,

				name: "Shop | E-Summit IITM",
				description: "Thank you for shopping!",
			};
			logger.info("Shop order generated");
			res.json(orderOptions);
		} else {
			res.json({ error: "Subscription could not be added" });
		}
	} catch (err) {
		console.log(err);
		res.json({ error: "Error occured while adding subscription" });
	}
};

const addOrder = async (req, res) => {
	try {
		const { items, totalPrice, paymentID, deliveryDetails } = req.body;
		const itemsDecoded = items.map((itemID) => {
			const [key, size, quantity] = itemID.split("-");
			return {
				key,
				size,
				quantity: parseInt(quantity),
			};
		});

		const orderDoc = new Order({
			items: itemsDecoded,
			deliveryDetails,
			totalPrice: parseInt(totalPrice),
			paymentDetails: {
				paymentID,
				captured: false,
			},
			delivered: false,
		});
		await orderDoc.save();

		const [tee1Doc, tee2Doc] = await Product.find().sort("key").exec();

		itemsDecoded.forEach(({ key, size, quantity }) => {
			if (key === "tee1" || key === "combo") {
				const { inStock, sold } = tee1Doc.stock.get(size);
				tee1Doc.stock.set(size, {
					inStock: inStock - quantity,
					sold: sold + quantity,
				});
			}
			if (key === "tee2" || key === "combo") {
				const { inStock, sold } = tee2Doc.stock.get(size);
				tee2Doc.stock.set(size, {
					inStock: inStock - quantity,
					sold: sold + quantity,
				});
			}
		});

		await Promise.all([tee1Doc.save(), tee2Doc.save()]);

		const orderString = itemsDecoded
			.map(({ key, quantity, size }) => `${quantity} ${productNames[key]} Size: ${size}`)
			.join(", ");
		await sendShopOrderSuccessMail(deliveryDetails.email, orderString);

		logger.info("Saved shop order", paymentID);
		res.json({ status: "ok" });
	} catch (err) {
		logger.error(err.message);
		console.error(err);
		process500(res, err.message);
	}
};

const verifyPayment = async (req, res) => {
	const secret = "b6AkPF~OO0IuBV*";
	const reqSignature = req.headers["x-razorpay-signature"];

	const isSignatureValid = Razorpay.validateWebhookSignature(req.rawBody, reqSignature, secret);

	if (isSignatureValid) {
		const paymentID = req.body.payload.payment.entity.id;

		if (req.body.event === "payment.authorized") {
			try {
				const notes = req.body.payload.payment.entity.notes;
				const { items: itemsSerialized, totalPrice, ...deliveryDetails } = notes;
				const itemsEncoded = JSON.parse(itemsSerialized);
				const itemsDecoded = itemsEncoded.map((itemID) => {
					const [key, size, quantity] = itemID.split("-");
					return {
						key,
						size,
						quantity: parseInt(quantity),
					};
				});

				const orderDoc = new Order({
					items: itemsDecoded,
					deliveryDetails,
					totalPrice: parseInt(totalPrice),
					paymentDetails: {
						paymentID,
						captured: false,
					},
					delivered: false,
				});
				await orderDoc.save();

				const [tee1Doc, tee2Doc] = await Product.find().sort("key").exec();

				itemsDecoded.forEach(({ key, size, quantity }) => {
					if (key === "tee1" || key === "combo") {
						const { inStock, sold } = tee1Doc.stock.get(size);
						tee1Doc.stock.set(size, {
							inStock: inStock - quantity,
							sold: sold + quantity,
						});
					}
					if (key === "tee2" || key === "combo") {
						const { inStock, sold } = tee2Doc.stock.get(size);
						tee2Doc.stock.set(size, {
							inStock: inStock - quantity,
							sold: sold + quantity,
						});
					}
				});

				await Promise.all([tee1Doc.save(), tee2Doc.save()]);
				logger.info("Saved shop order", paymentID);
				res.json({ status: "ok" });
			} catch (err) {
				logger.error(err.message);
				console.error(err);
				res.json({ status: "ok" });
			}
		}
		if (req.body.event === "payment.captured") {
			try {
				const { email, items: itemsSerialized } = req.body.payload.payment.entity.notes;
				const itemsEncoded = JSON.parse(itemsSerialized);

				const orderString = itemsEncoded
					.map((itemID) => {
						const [key, size, quantity] = itemID.split("-");
						return `${quantity} ${productNames[key]} Size: ${size}`;
					})
					.join(", ");

				await Order.updateOne(
					{
						"paymentDetails.paymentID": paymentID,
					},
					{ "paymentDetails.captured": true }
				).exec();

				await sendShopOrderSuccessMail(email, orderString);

				logger.info("Payment Captured for order", paymentID);
				res.json({ status: "ok" });
			} catch (err) {
				logger.error(err.message);
				console.error(err);
				res.json({ status: "ok" });
			}
		}
	} else {
		res.json({ status: "ok" });
	}
};

const postProducts = async (req, res) => {
	try {
		const products = ["tee1", "tee2"].map((key) => ({
			key,
			title: key === "tee1" ? "Iron Man Tee" : "Loading Success",
			stock: new Map([
				["XS", { inStock: 15, sold: 0 }],
				["S", { inStock: 35, sold: 0 }],
				["M", { inStock: 50, sold: 0 }],
				["L", { inStock: 60, sold: 0 }],
				["XL", { inStock: 50, sold: 0 }],
				["XXL", { inStock: 25, sold: 0 }],
				["XXXL", { inStock: 15, sold: 0 }],
			]),
			price: key === "tee1" ? 400 : 350,
		}));
		await Product.create(products);
		processData(res, "Products added");
	} catch (error) {
		console.log(error);
	}
};

module.exports = { createOrder, addOrder, postProducts, getProducts };
