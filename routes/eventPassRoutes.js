const express = require("express");

const eventPassRoutes = express.Router();
const eventPassController = require("../controllers/eventPassController");

eventPassRoutes.post("/verify", eventPassController.verifyRegistration);
eventPassRoutes.post("/order", eventPassController.createOrder);
// eventPassRoutes.post("/catch", eventPassController.catchPaymentAndRegister);
eventPassRoutes.post("/register", eventPassController.register);

module.exports = eventPassRoutes;
