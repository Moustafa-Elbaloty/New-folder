const mongoose = require("mongoose");
const { type } = require("os");
const { ref } = require("process");
const { stringify } = require("querystring")

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Product Name Is Required"],
        trim: true,
        minLength: [2, "product name must be at least 2 characters"],
        maxLength: [50, "product name must be at least 50 characters"],
    },
    price: {
        type: Number,
        required: [true, "Product price Is Required"],
        trim: true,
        min: [0, "Price cannot be less than 0"],
    },
    description: {
        type: String,
        required: [true, "Product description is requiered"],
        trim: true,
        minLength: [10, "product description must be at least 10 characters"],
        maxLength: [1000, "product description must be at least 1000 characters"],
    },
    category: {
        type: String,
        required: [true, "product category is required"],
        enum: ["electronics", "smart phones"],
    },
    stock: {
        type: Number,
        required: [true, "quantaty in the stock is required"],
        min: [0, "quantity cannot be less than 0"],
        default: 0,
    },
    image: {
        type: String,
        required: [true, "product image required"],
        validate: {
            validator: function (url) {
                if (!url) return true; // Optional field
                return /^(https?:\/\/).*$/.test(url);
            },
            message: "Image URL must start with http or https",
        }
    },
    vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
}

},
    { timestamps: true },
);
productSchema.index({ name: "text", description: "text", category: "text" });

productSchema.pre("save", function (next) {
    this.updatedAt = Date.now();
    next();
});
module.exports = mongoose.model("Product", productSchema);