const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema.Types;

const productSchema = new mongoose.Schema({
	key: { type: String, unique: true }, // "tee1" | "tee2" | "combo"
	title: String,

	stock: {
		type: Map,
		of: {
			inStock: Number, // decreases
			sold: Number, // increases
		},
	},

	price: Number,

	creationTime: { type: Number, default: Date.now },
	lastUpdated: { type: Number, default: Date.now },
});

productSchema.pre("save", function (next) {
	this.lastUpdated = Date.now();
	next();
});

productSchema.pre("updateOne", function (next) {
	this.lastUpdated = Date.now();
	next();
});

module.exports = mongoose.model("products", productSchema);
