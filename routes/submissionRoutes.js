const express = require("express");
const submissionRouter = express.Router();
const BootCampController = require("../controllers/events/BootCampController");
const MarkathonController = require("../controllers/events/MarkathonController");
const ProductConstructController = require("../controllers/events/ProductConstructController");
const EAwardsController = require("../controllers/events/EAwardsController");
const ElympicsController = require("../controllers/events/ElympicsController");
const BoardroomController = require("../controllers/events/BoardroomController");
const UnconferenceController = require("../controllers/events/UnconferenceController");
const StrategizeController = require("../controllers/events/StrategizeController");

submissionRouter.post("/bootcamp/:round", BootCampController);
// submissionRouter.post("/markathon/:round", MarkathonController);

submissionRouter.get(
	"/unconference/s3-signed-policy/:bucketName",
	UnconferenceController.getS3SignedPolicy
);
submissionRouter.post(
	"/unconference/case-study-choice",
	UnconferenceController.unconferenceChoiceSubmit
);
submissionRouter.post("/unconference/:round", UnconferenceController.unconferenceSubmit);

submissionRouter.get(
	"/strategize/s3-signed-policy/:bucketName",
	StrategizeController.getS3SignedPolicy
);
submissionRouter.post("/strategize/:round", StrategizeController.strategizeSubmit);

submissionRouter.get(
	"/markathon/s3-signed-policy/:bucketName",
	MarkathonController.getS3SignedPolicy
);
submissionRouter.post("/markathon/:round", MarkathonController.markathonSubmit);

submissionRouter.get(
	"/productConstruct/s3-signed-policy/:bucketName",
	ProductConstructController.getS3SignedPolicy
);

submissionRouter.post(
	"/productConstruct/:round",
	ProductConstructController.productConstructSubmit
);

submissionRouter.get("/e-awards/s3-signed-policy/:bucketName", EAwardsController.getS3SignedPolicy);

submissionRouter.post("/e-awards/:round", EAwardsController.eAwardsSubmit);

submissionRouter.get(
	"/elympics/s3-signed-policy/:bucketName",
	ElympicsController.getS3SignedPolicy
);

submissionRouter.post("/elympics/:round", ElympicsController.elympicsSubmit);

submissionRouter.get(
	"/boardroom/s3-signed-policy/:bucketName",
	BoardroomController.getS3SignedPolicy
);

submissionRouter.post("/boardroom/:round", BoardroomController.boardroomSubmit);

module.exports = submissionRouter;
