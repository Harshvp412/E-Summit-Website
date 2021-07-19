const mongoose = require("mongoose");

// const MONGODB_URI =
// process.env.NODE_ENV === "production"
// ? "mongodb+srv://webops_ecell_iitm:D6CDp5BhzE7xfqs5@e-summit2021-cluster.x2bdy.mongodb.net/e_summit_2021?retryWrites=true&w=majority"
// : "mongodb://localhost:27017/esummit";

const MONGODB_URI =
	"mongodb+srv://webops_ecell_iitm:D6CDp5BhzE7xfqs5@e-summit2021-cluster.x2bdy.mongodb.net/e_summit_2021?retryWrites=true&w=majority";

const connectToMongoDB = () => {
	mongoose.connect(MONGODB_URI, {
		useNewUrlParser: true,
		useCreateIndex: true,
		useUnifiedTopology: true,
		autoCreate: true,
		useFindAndModify: false,
	});
	mongoose.connection.once("open", () => {
		console.log("MongoDB database connection established successfully");
	});
	mongoose.connection.on("error", (err) => {
		console.error(err);
		console.info("MongoDB connection error. Please make sure MongoDB is running.");
		process.exit();
	});
};

module.exports = {
	connectToMongoDB,
};
