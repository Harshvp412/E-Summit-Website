const api_key_array = [
	// vandanamashalkar12@gmail.com
	"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",
	// be18b021@smail.iitm.ac.in
	"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",
	// synthcmas@gmail.com
	"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",
	// gaurikmukherjee@gmail.com
	"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",
	// atharvamashalkar1821@gmail.com
	"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",
	//sr_ecell@iitm.ac.in
	"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",
	//eclub@smail.iitm.ac.in
	"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",
	// akshit2000.bagde@gmail.com
	"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",
	// ee17b103@smail.iitm.ac.in
	"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",
	// ce18b136@smail.iitm.ac.in
	"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",
];

// info@esummitiitm.org
const PREMIUM_API_KEY = "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";

// The generator function
function* getApiKeys(limit) {
	let num = 0;

	while (true) {
		if (num === limit) return api_key_array[limit - 1];
		yield api_key_array[num++];
	}
}

const limit = api_key_array.length;
let apiKeys = getApiKeys(limit);

const configSendGrid = () => {
	const sgMail = require("@sendgrid/mail");
	sgMail.setApiKey(api_key_array[7]);
	return sgMail;
};

module.exports = { configSendGrid, apiKeys, api_key_array };
