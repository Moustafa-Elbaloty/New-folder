const mongoose = require("mongoose");

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
        min: [0, "Price cannot be less than 0"],
    },
    description: {
        type: String,
        required: [true, "Product description is required"],
        trim: true,
        minLength: [10, "product description must be at least 10 characters"],
        maxLength: [1000, "product description must be at least 1000 characters"],
    },
    category: {
        type: String,
        required: true,
        enum: ["electronics", "smart phones"],
    },
    stock: {
        type: Number,
        required: true,
        min: [0, "quantity cannot be less than 0"],
        default: 0,
    },
    image: {
        type: String,
        required: [true, "Product image is required"],
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    brand: {
        type: String,
        required: true,
        enum: ["Apple", "Samsung", "Xiaomi", "Oppo", "Huawei", "Other"],
    }
}, { timestamps: true });

// Prevent same vendor from adding duplicate products
productSchema.index(
    { vendor: 1, name: 1, description: 1 },
    { unique: true }
);

// Text search index
productSchema.index({ name: "text", description: "text", category: "text" });

module.exports = mongoose.model("Product", productSchema);
