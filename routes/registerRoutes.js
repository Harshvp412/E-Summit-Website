const express = require("express");
const registerRouter = express.Router();
const registerController = require("../controllers/registerController");

registerRouter.post("/team/:event", registerController.teamRegister);
registerRouter.post("/solo/:event", registerController.soloRegister);
registerRouter.post("/add-team-member/:password", registerController.addMemberToTeam);

module.exports = registerRouter;
