const express = require("express");
const { Logform } = require("winston");
const viewRoutes = express.Router();

const checkLoggedin = (req) => {
	const cookieStr = req.headers.cookie;
	const isLoggedIn =
		cookieStr &&
		cookieStr.includes("ESUMMIT_IITM_USER_SUMMIT_ID") &&
		cookieStr.includes("ESUMMIT_IITM_AUTH_TOKEN");
	return isLoggedIn;
};

const checkRegistered = (req, eventName) => {
	const { participatedEvents } = req.cookies;

	if (!participatedEvents) return false;
	const parsedEvents = JSON.parse(participatedEvents);
	const isRegistered = parsedEvents.includes(eventName);

	return isRegistered;
};

viewRoutes.get("/", async (req, res) => {
	const isLoggedIn = checkLoggedin(req);
	res.render("index", { isLoggedIn });
});

viewRoutes.get("/innovators-conclave", async (req, res) => {
	const isLoggedIn = checkLoggedin(req);
	res.render("innovators", { isLoggedIn });
});
viewRoutes.get("/startup-conclave", async (req, res) => {
	const isLoggedIn = checkLoggedin(req);
	res.render("startup", { isLoggedIn });
});
viewRoutes.get("/youth-conclave", async (req, res) => {
	const isLoggedIn = checkLoggedin(req);
	res.render("youth", { isLoggedIn });
});
viewRoutes.get("/terms-and-conditions", async (req, res) => {
	res.render("terms-and-conditions");
});
viewRoutes.get("/privacy-policy", async (req, res) => {
	res.render("privacy-policy");
});
viewRoutes.get("/esummit-pass", async (req, res) => {
	const isLoggedIn = checkLoggedin(req);
	res.render("inspirit", { isLoggedIn });
});
viewRoutes.get("/sponsors", async (req, res) => {
	const isLoggedIn = checkLoggedin(req);
	res.render("sponsors", { isLoggedIn });
});

const events = [
	"bootcamp",
	"unconference",
	"product-construct",
	"elevate",
	"startup-showcase",
	"e-awards",
	"biz-quiz",
	"elympics",
	"markathon",
	"boardroom",
	"idea-validation",
	"stocks-are-high",
	"business-simulation-game",
	"strategize",
];

viewRoutes.get("/event/:name", async (req, res) => {
	const { name } = req.params;
	if (events.includes(name)) {
		const isLoggedIn = checkLoggedin(req);
		const isRegistered = checkRegistered(req, name);

		res.render(name, { isLoggedIn, isRegistered }, (err, html) => {
			if (err && err.message.startsWith("Failed to lookup view")) {
				res.redirect("/");
			} else {
				res.send(html);
			}
		});
	} else {
		// If route not found redirect to homepage
		res.redirect("/");
	}
});

viewRoutes.get("/go-portal", (req, res) => {
	const isLoggedIn = checkLoggedin(req);
	if (isLoggedIn) {
		res.redirect("https://esummitiitm.org/portal");
	} else {
		res.redirect("/");
	}
});

module.exports = viewRoutes;
