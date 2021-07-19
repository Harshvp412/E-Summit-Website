const express = require("express");
const app = express();

const compression = require("compression");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

const { connectToMongoDB } = require("./config/mongodbConfig");

//Setting port
const PORT = process.env.PORT || 5100;

//Connecting Mongodb Database
connectToMongoDB();

//Requiring routes
const viewRoutes = require("./routes/viewRoutes");
const apiRouter = require("./routes/apiRoutes");

// Set EJS and host static files
app.set("view engine", "ejs");
app.use(express.static("assets"));

// Required Middleware

// CORS stuff
app.use(
	cors({
		credentials: true,
		origin: [
			"http://127.0.0.1:3000",
			"http://localhost:3000",
			"https://esummitiitm.org",
			"https://shop.esummitiitm.org",
			"https://gc-admin.netlify.app",
		],
	})
);

// Parsing Request body and cookies
app.use(
	"/api/payment/capture",
	bodyParser.json({
		verify: (req, res, buf) => {
			req.rawBody = buf;
		},
	})
);
app.use(
	"/api/shop/payment-verification",
	bodyParser.json({
		verify: (req, res, buf) => {
			req.rawBody = buf;
		},
	})
);
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true, parameterLimit: 50000 }));

// Compression and security
app.use(compression({ level: 9 }));
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				...helmet.contentSecurityPolicy.getDefaultDirectives(),
				"script-src": [
					"'self'",
					"'unsafe-inline'",
					"https://cdn.jsdelivr.net",
					"https://unpkg.com",
					"https://ajax.googleapis.com/",
					"https://www.googletagmanager.com",
				],
				"frame-src": ["https://www.youtube.com"],
				"connect-src": ["https://www.google-analytics.com", "'self'"],
			},
		},
		referrerPolicy: {
			policy: "no-referrer-when-downgrade",
		},
	})
);

//Setting Routes
app.use(viewRoutes);
app.use("/api", apiRouter);

//Starting the server
app.listen(PORT, () => {
	console.log(`You are listening to Port ${PORT}`);
});
