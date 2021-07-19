const express = require("express");
const userRouter = express.Router();
const userController = require("../controllers/userController");

userRouter.post("/login", userController.login);
// userRouter.post("/register", userController.register);
userRouter.get("/check-user/:by", userController.checkUser);
userRouter.get("/send-mail", userController.verifyAndSendMail);
userRouter.get("/details", userController.getDetails);
userRouter.get("/events", userController.getEvents);
userRouter.get("/workshops", userController.getWorkshops);
userRouter.get("/event-details/:eventName", userController.getEventDetails);
userRouter.get("/logout", userController.logout);
userRouter.get("/pw-reset-mail", userController.resetPasswordMail);
userRouter.post("/reset-password", userController.resetPasswordFromCode);
userRouter.post("/update/:updateType", userController.updateStudentData);

module.exports = userRouter;
