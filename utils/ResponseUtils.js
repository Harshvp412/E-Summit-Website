const ErrorCodes = require("./ErrorCodes");

const ResponseUtils = {
	process500: (
		res,
		msg = ErrorCodes.SOMETHING_WENT_WRONG.errorMessage,
		errorCode = ErrorCodes.SOMETHING_WENT_WRONG.errorCode
	) => {
		return res.status(500).json({
			success: false,
			msg,
			errorCode,
		});
	},
	process400: (
		res,
		msg = ErrorCodes.BAD_REQUEST_ERROR.errorMessage,
		errorCode = ErrorCodes.BAD_REQUEST_ERROR.errorCode
	) => {
		return res.status(400).json({
			success: false,
			msg,
			errorCode,
		});
	},
	process404: (
		res,
		msg = ErrorCodes.NOT_FOUND_ERROR.errorMessage,
		errorCode = ErrorCodes.NOT_FOUND_ERROR.errorCode
	) => {
		return res.status(404).json({
			success: false,
			msg,
			errorCode,
		});
	},
	process401: (
		res,
		msg = ErrorCodes.UNAUTHORIZED.errorMessage,
		errorCode = ErrorCodes.UNAUTHORIZED.errorCode
	) => {
		return res.status(401).json({
			success: false,
			msg,
			errorCode,
		});
	},

	processData: (res, data) => {
		return res.status(200).json({ success: true, data });
	},
};

module.exports = ResponseUtils;
