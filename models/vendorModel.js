const mongoose = require("mongoose")

const vendorSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    storeName: { type: String, required: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    verified: { type: Boolean, default: false },
},
    { timestamps: true },
);


const vendorModel = mongoose.model("Vendor", vendorSchema)
module.exports = vendorModel;