const express = require("express");

const apiRouter = express.Router();
const adminRoutes = require("./adminRoutes");
const userRoutes = require("./userRoutes");
// const registerRoutes = require("./registerRoutes");
const submissionRoutes = require("./submissionRoutes");
const paymentRoutes = require("./paymentRoutes");
const shopRoutes = require("./shopRoutes");
const growthConclaveRoutes = require("./growthConclaveRoutes");
// const eventPassRoutes = require("./eventPassRoutes");

apiRouter.use("/esummit-admin", adminRoutes);
apiRouter.use("/esummit-user", userRoutes);
// apiRouter.use("/register", registerRoutes);
apiRouter.use("/submit", submissionRoutes);
apiRouter.use("/payment", paymentRoutes);
apiRouter.use("/shop", shopRoutes);
apiRouter.use("/growth-conclave", growthConclaveRoutes);
// apiRouter.use("/event-pass", eventPassRoutes);

module.exports = apiRouter;
