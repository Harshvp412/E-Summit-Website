const express = require("express");

const growthConclaveRoutes = express.Router();
const growthConclaveController = require("../controllers/growthConclaveController");

growthConclaveRoutes.post("/verification", growthConclaveController.verify);
growthConclaveRoutes.post("/order", growthConclaveController.createOrder);
// growthConclaveRoutes.post("/catch", growthConclaveController.catchPaymentAndRegister);
growthConclaveRoutes.post("/register", growthConclaveController.register);

growthConclaveRoutes.post("/admin/login", growthConclaveController.adminLogin);
growthConclaveRoutes.get("/admin/logout", growthConclaveController.adminLogout);
growthConclaveRoutes.get("/admin/stats", growthConclaveController.getAllWorkshopsStats);
growthConclaveRoutes.get("/admin/workshop/:key", growthConclaveController.getWorkshopRegistrants);
growthConclaveRoutes.get("/admin/combo/:key", growthConclaveController.getComboRegistrants);
growthConclaveRoutes.get(
	"/admin/unique/:key",
	growthConclaveController.getUniqueWorkshopRegistrants
);

module.exports = growthConclaveRoutes;
