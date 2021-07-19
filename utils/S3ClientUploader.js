const crypto = require("crypto");

const AWS_ACCESS_KEY_ID = "AKIAYPOAL7JRWLENSOW7";
const AWS_SECRET_ACCESS_KEY = "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";

const regionName = "ap-south-1";

const maxFileSize = 200 * 1024 * 1024;

class S3SignedPolicy {
	constructor(bucketName) {
		this.bucket = bucketName;
		this.bucketAcl = "public-read";
		this.expirationStr = this.createExpDate();
		this.expirationStrClean = this.expirationStr.split(/[:\-.]/g).join("");
		this.amzCred = this.createAMZCred(this.expirationStrClean);
		this.encodedPolicy = this.createEncodedPolicy();
		this.sign = this.createSignedPolicy(this.encodedPolicy, this.expirationStrClean);
	}

	createExpDate() {
		let expirationDate = new Date();

		expirationDate.setMinutes(expirationDate.getMinutes() + 20);
		const expirationStr = expirationDate.toISOString();

		return expirationStr;
	}

	createAMZCred(cleanISOString) {
		const YYYYMMDD = cleanISOString.slice(0, 8);
		const amzCred = AWS_ACCESS_KEY_ID + "/" + YYYYMMDD + "/" + regionName + "/s3/aws4_request";

		return amzCred;
	}

	createSignedPolicy(encodedPolicy, cleanISOString) {
		let YYYYMMDD = cleanISOString.slice(0, 8);
		var kDate = crypto
			.createHmac("sha256", "AWS4" + AWS_SECRET_ACCESS_KEY)
			.update(YYYYMMDD)
			.digest("");
		var kRegion = crypto.createHmac("sha256", kDate).update(regionName).digest("");
		var kService = crypto.createHmac("sha256", kRegion).update("s3").digest("");
		var kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest("");

		var sign = crypto.createHmac("sha256", kSigning).update(encodedPolicy).digest("hex");

		return sign;
	}

	createEncodedPolicy() {
		const s3Policy = {
			expiration: this.expirationStr,
			conditions: [
				{ bucket: this.bucket },
				["starts-with", "$key", ""],
				{ acl: this.bucketAcl },
				["content-length-range", 0, maxFileSize],
				["starts-with", "$Content-Type", ""],
				{ "x-amz-algorithm": "AWS4-HMAC-SHA256" },
				{ "x-amz-credential": this.amzCred },
				{ "x-amz-date": this.expirationStrClean },
			],
		};

		var encodedPolicy = Buffer.from(JSON.stringify(s3Policy)).toString("base64");
		return encodedPolicy;
	}
}

module.exports = { S3SignedPolicy };
