const express = require("express");

const paymentRouter = express.Router();
const paymentController = require("../controllers/paymentController");

paymentRouter.post("/order-create/:event", paymentController.createOrder);
// paymentRouter.post("/verification", paymentController.verifyPayment);
paymentRouter.post("/capture", paymentController.capturePayment);

module.exports = paymentRouter;
