const pdfFilter = function (req, file, cb) {
	// Accept PDF files only
	if (file.mimetype !== "application/pdf") {
		req.fileValidationError = "Only PDF files are allowed!";
		return cb(new Error("Only PDF files are allowed!"), false);
	}
	cb(null, true);
};
exports.pdfFilter = pdfFilter;
