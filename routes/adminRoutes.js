const express = require("express");
const adminRouter = express.Router();
const adminController = require("../controllers/adminController");

adminRouter.post("/login", adminController.login);
adminRouter.get("/logout", adminController.logout);
adminRouter.get("/dashboard/events", adminController.getEvents);
// adminRouter.get("/dashboard/event/get-event-status", adminController.getEventStatus);
adminRouter.post("/dashboard/event/register-through-csv", adminController.registerThroughCSV);
adminRouter.post("/dashboard/event/toggle-event-status", adminController.toggleEventStatus);

adminRouter.post("/dashboard/event/participants", adminController.getParticipants);
adminRouter.post("/dashboard/event/promote-participants", adminController.promoteParticipants);

adminRouter.get("/pw-reset-mail", adminController.resetPasswordMail);
adminRouter.post("/reset-password", adminController.resetPasswordFromCode);

module.exports = adminRouter;
