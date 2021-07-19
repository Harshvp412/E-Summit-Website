const getRandomInteger = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Make a Summit ID
 */
function getSummitID() {
	const PREFIX = "ES21";
	const randomNumber = getRandomInteger(500, 9999);

	const trailingString = randomNumber.toString();
	const paddedTrailingString = trailingString.padStart(4, "0");

	const summitID = PREFIX + paddedTrailingString;

	return summitID;
}

module.exports = getSummitID;
