/* eslint-disable no-unused-vars */
const fs = require("fs");
const path = require("path");

// https://sendgrid.com/docs/API_Reference/Web_API_v3/Mail/errors.html
const { configSendGrid, api_key_array } = require("../config/sendGridConfig");
const logger = require("./LoggerUtils");
const sg = configSendGrid();

const ESUMMIT_EMAIL = "info@esummitiitm.org";
const WEBOPS_EMAIL = "webops_ecell@smail.iitm.ac.in";

function readAndParseHTML(filename, resetCode = "", eventName = "") {
	const filePath = path.join(__dirname, "..", "assets", "mail-templates", `${filename}.html`);
	const html = fs.readFileSync(filePath);
	const templateStr = eval("`" + html.toString() + "`");

	return templateStr;
}

function readAndParseHTMLforCSV(
	filename,
	userName,
	summitID,
	password,
	eventName = "",
	eventDisplayName
) {
	const filePath = path.join(__dirname, "..", "assets", "mail-templates", `${filename}.html`);
	const html = fs.readFileSync(filePath);
	const templateStr = eval("`" + html.toString() + "`");

	return templateStr;
}

/**
 * Send password reset mails
 * @param {string} recipientMail The recipient's E-Mail ID
 * @param {string} resetCode The password change token
 */
async function sendPasswordResetMail(recipientMail, resetCode) {
	let emailSent = false;
	for (const nextApiKey of api_key_array) {
		try {
			sg.setApiKey(nextApiKey);

			await sg.send({
				from: {
					email: ESUMMIT_EMAIL,
					name: "E-Summit IITM",
				},
				to: recipientMail,
				replyTo: WEBOPS_EMAIL,
				subject: "Password Reset | E-Summit '21 | E-Cell IITM",
				html: readAndParseHTML("forgot-password", resetCode),
			});
			emailSent = true;
			logger.info(`Password reset E-Mail sent to ${recipientMail}`);
			break;
		} catch (error) {
			console.log(error.response && error.response.body.errors[0].message);
			console.log("Retrying Sending Email");
		}
	}
	if (!emailSent) {
		throw new Error("Email could not be sent.");
	}
}

/**
 * Send Verification mail to someone
 *
 * @param {string} recipientMail
 * @param {string} verificationCode
 */
async function sendVerificationMail(recipientMail, verificationCode) {
	let emailSent = false;
	for (const nextApiKey of api_key_array) {
		try {
			sg.setApiKey(nextApiKey);
			console.log(sg.client.auth);
			await sg.send({
				from: {
					email: ESUMMIT_EMAIL,
					name: "E-Summit IITM",
				},
				to: recipientMail,
				replyTo: WEBOPS_EMAIL,
				subject: "Verification Code | E-summit '21 | E-Cell IITM",
				html: readAndParseHTML("email-verification", verificationCode),
			});
			logger.info(`Verification Email sent to ${recipientMail}`);
			emailSent = true;
			break;
		} catch (error) {
			console.log(error.response.body.errors[0].message);
			console.log("Retrying Sending Email");
		}
	}
	if (!emailSent) {
		console.log("Email couldn't be sent");
		throw new Error("Email could not be sent.");
	}
}

/**
 * Send registration success mail to someone
 *
 * @param {string} recipientMail
 * @param {string} summitID Summit ID
 */
async function sendRegistrationSuccessMail(recipientMail, summitID) {
	let emailSent = false;
	for (const nextApiKey of api_key_array) {
		try {
			sg.setApiKey(nextApiKey);
			await sg.send({
				from: {
					email: ESUMMIT_EMAIL,
					name: "E-Summit IITM",
				},
				to: recipientMail,
				replyTo: WEBOPS_EMAIL,
				subject: "Registration successful | E-Summit '21 | E-Cell IITM",
				html: readAndParseHTML("registration-success", summitID),
			});
			emailSent = true;
			logger.info(`Registration Email sent to ${recipientMail}`);
			break;
		} catch (error) {
			console.log(error.response && error.response.body.errors[0].message);
			console.log("Retrying Sending Email");
		}
	}
	if (!emailSent) {
		throw new Error("Email could not be sent.");
	}
}

async function sendShopOrderSuccessMail(recipientMail, orderString) {
	let emailSent = false;
	for (const nextApiKey of api_key_array) {
		try {
			sg.setApiKey(nextApiKey);

			await sg.send({
				from: {
					email: ESUMMIT_EMAIL,
					name: "E-Summit IITM | Shop",
				},
				to: recipientMail,
				replyTo: WEBOPS_EMAIL,
				subject: "Order Placed | E-Summit '21 Shop | E-Cell IITM",
				html: readAndParseHTML("order-success", orderString),
			});
			emailSent = true;
			logger.info(`Order Success Email sent to ${recipientMail}`);
			break;
		} catch (error) {
			console.log(error.response && error.response.body.errors[0].message);
			console.log("Retrying Sending Email");
		}
	}
	if (!emailSent) {
		throw new Error("Email could not be sent.");
	}
}

async function sendRegistrationSuccessMailforCSV(
	recipientMail,
	userName,
	summitID,
	password,
	eventName,
	eventDisplayName
) {
	let emailSent = false;
	for (const nextApiKey of api_key_array) {
		try {
			sg.setApiKey(nextApiKey);
			await sg.send({
				from: {
					email: ESUMMIT_EMAIL,
					name: "E-Summit IITM",
				},
				to: recipientMail,
				replyTo: WEBOPS_EMAIL,
				subject: "Registration successful | E-Summit '21 | E-Cell IITM",
				html: readAndParseHTMLforCSV(
					"csv-registration-successful",
					userName,
					summitID,
					password,
					eventName,
					eventDisplayName
				),
			});
			emailSent = true;
			logger.info(`Registration Email sent to ${recipientMail}`);

			break;
		} catch (error) {
			console.log(error.response && error.response.body.errors[0].message);
			console.log("Retrying Sending Email");
		}
	}
	if (!emailSent) {
		throw new Error("Email could not be sent.");
	}
}

async function sendRegistrationSuccessMailforCSVEventOnly(
	recipientMail,
	userName,
	summitID,
	eventName,
	eventDisplayName
) {
	let emailSent = false;
	for (const nextApiKey of api_key_array) {
		try {
			sg.setApiKey(nextApiKey);
			await sg.send({
				from: {
					email: ESUMMIT_EMAIL,
					name: "E-Summit IITM",
				},
				to: recipientMail,
				replyTo: WEBOPS_EMAIL,
				subject: "Registration successful | E-Summit '21 | E-Cell IITM",
				html: readAndParseHTMLforCSV(
					"csv-registration-successful-event-only",
					userName,
					summitID,
					null,
					eventName,
					eventDisplayName
				),
			});
			logger.info(`Registration Email sent to ${recipientMail}`);

			emailSent = true;
			break;
		} catch (error) {
			console.log(error.response && error.response.body.errors[0].message);
			console.log("Retrying Sending Email");
		}
	}
	if (!emailSent) {
		throw new Error("Email could not be sent.");
	}
}

async function sendMailForUnsuccessfulTeamRegistration(recipientMail, eventName, eventDisplayName) {
	let emailSent = false;
	for (const nextApiKey of api_key_array) {
		try {
			sg.setApiKey(nextApiKey);
			await sg.send({
				from: {
					email: ESUMMIT_EMAIL,
					name: "E-Summit IITM",
				},
				to: recipientMail,
				replyTo: WEBOPS_EMAIL,
				subject: "Registration unsuccessful | E-Summit '21 | E-Cell IITM",
				html: readAndParseHTMLforCSV(
					"team-registration-unsuccessful",
					null,
					null,
					null,
					eventName,
					eventDisplayName
				),
			});
			emailSent = true;
			logger.info(`Registration Email sent to ${recipientMail}`);
			break;
		} catch (error) {
			console.log(error.response && error.response.body.errors[0].message);
			console.log("Retrying Sending Email");
		}
	}
	if (!emailSent) {
		throw new Error("Email could not be sent.");
	}
}

module.exports = {
	sendPasswordResetMail,
	sendVerificationMail,
	sendShopOrderSuccessMail,
	sendRegistrationSuccessMail,
	sendRegistrationSuccessMailforCSV,
	sendRegistrationSuccessMailforCSVEventOnly,
	sendMailForUnsuccessfulTeamRegistration,
};
