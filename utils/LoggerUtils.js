const { createLogger, format, transports } = require("winston");

const customFormat = format.printf(({ level, message, timestamp, ...meta }) => {
	const serializedMetadata = JSON.stringify(meta);
	return `${timestamp} [${level}] ${message}${
		serializedMetadata !== "{}" ? " : " + serializedMetadata : ""
	}`;
});

const logger = createLogger({
	level: "info",
	format: format.combine(
		format.timestamp({
			format: "DD-MM-YY HH:mm",
		}),
		format.json(),
		customFormat
	),
	transports: [
		new transports.Console({
			format: format.combine(
				format.colorize(),
				format.simple(),
				format.timestamp({
					format: "DD-MM-YY HH:mm",
				}),
				format.json(),
				customFormat
			),
		}),
	],
});

//
// If we're in production then log to a file.
//
if (process.env.NODE_ENV === "production") {
	logger.add(
		new transports.File({ filename: "running-errors.log", level: "error" }),
		new transports.File({ filename: "running-warnings.log", level: "warning" })
	);
}

// ************* //
// Example Usage //
// ************* //

// logger.info("Email sent");
// logger.error("Email not sent", {
// 	email: "email",
// 	useragent: "hahah",
// });

module.exports = logger;
