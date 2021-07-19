const express = require("express");

const shopRouter = express.Router();
const shopController = require("../controllers/shopController");
const { captureShopPayment } = require("../controllers/paymentController");

shopRouter.post("/order-create", shopController.createOrder);
shopRouter.post("/payment-verification", captureShopPayment);
shopRouter.get("/products", shopController.getProducts);
shopRouter.post("/add", shopController.addOrder);

// no-frontend
shopRouter.post("/products", shopController.postProducts);

module.exports = shopRouter;
