const productModel = require("../models/productModel");
const vendorModel = require("../models/vendorModel");

// Add Product (improved)
const addProduct = async (req, res) => {
  try {
    // Authorization
    if (!req.user || (req.user.role !== "vendor" && req.user.role !== "admin")) {
      return res.status(403).json({ success: false, message: "Only vendors or admins can add products" });
    }

    // debug logs (يمكن ازالتها بعد التأكد)
    console.log(">>> addProduct debug");
    console.log("req.user:", req.user);
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);
    console.log("<<< end debug");

    // extract fields
    const { name, price, description, category, stock, brand } = req.body;

    // جمع الحقول المفقودة عشان نعرض رسالة واضحة
    const missing = [];
    if (!name) missing.push("name");
    if (!price) missing.push("price");
    if (!description) missing.push("description");
    if (!category) missing.push("category");
    if (stock == null || stock === "") missing.push("stock");
    if (!brand) missing.push("brand");

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        missingFields: missing
      });
    }

    // file check (Multer)
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Image file is required" });
    }

    // تحويل القيم لأن form-data يجيب القيم كنصوص
    const priceNumber = Number(price);
    const stockNumber = Number(stock);

    if (Number.isNaN(priceNumber) || priceNumber < 0) {
      return res.status(400).json({ success: false, message: "Invalid price" });
    }
    if (!Number.isInteger(stockNumber) || stockNumber < 0) {
      return res.status(400).json({ success: false, message: "Invalid stock" });
    }

    const imagePath = `/uploads/${req.file.filename}`;

    // العثور على vendor
    const vendor = await vendorModel.findOne({ user: req.user.id });
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    // إنشاء المنتج
    const product = await productModel.create({
      name: name.trim(),
      price: priceNumber,
      description: description.trim(),
      category: category.trim(),
      stock: stockNumber,
      brand: brand.trim(),
      image: imagePath,
      vendor: vendor._id,
    });

    // إضافة للـ vendor.products
    vendor.products.push(product._id);
    await vendor.save();

    // optional: emit socket event
    if (req.io && typeof req.io.emit === "function") {
      req.io.emit("new-product", {
        message: `New product added: ${product.name}`,
        productId: product._id,
      });
    }

    res.status(201).json({ success: true, message: "New product added successfully!", data: product });

  } catch (error) {
    console.error("addProduct error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Duplicate product", error: error.keyValue });
    }
    res.status(500).json({ success: false, message: "error adding product", error: error.message });
  }
};


// Update product //
const updateProduct = async (req, res) => {
  try {
    // Extract product ID from request parameters //
    const { id } = req.params;
    // find product in database //
    const product = await productModel.findById(id);
    // if product not found //
    if (!product) {
      return res.status(404).json({ message: "product not found" });
    }
    // Check permission — only admin or the vendor who owns it can update //
    const vendor = await vendorModel.findOne({ user: req.user.id });

    if (req.user.role !== "admin" && product.vendor.toString() !== vendor._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only update your own products" });
    }
    // update product //
    const updatedProduct = await productModel.findByIdAndUpdate(id, req.body, { new: true })
    req.io.emit("update-product", {
      message: `Product updated: ${updatedProduct.name}`,
      productId: updatedProduct._id,
    });
    res.status(200).json({ success: true, message: "product updated successfully!", data: updatedProduct })

  } catch (error) {
    res.status(500).json({ success: false, message: "error update product ", error: error.message })
  }

};



// delete product 
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // 1) Get product
    const product = await productModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 2) Get vendor of logged-in user
    const vendor = await vendorModel.findOne({ user: req.user.id });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // 3) Fix old products with no vendor field
    if (!product.vendor) {
      product.vendor = vendor._id;
      await product.save();
    }

    // 4) Permission check
    if (
      req.user.role !== "admin" &&
      product.vendor.toString() !== vendor._id.toString()
    ) {
      return res.status(403).json({
        message: "You can only delete your own products"
      });
    }

    // 5) Delete product from DB
    await productModel.findByIdAndDelete(id);

    // 6) Remove product from vendor.products list
    await vendorModel.findByIdAndUpdate(product.vendor, {
      $pull: { products: product._id }
    });

    req.io.emit("delete-product", {
      message: `Product deleted: ${product.name}`,
      productId: product._id,
    });
    res.status(200).json({ success: true, message: "Product deleted" });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "error delete product",
      error: error.message,
    });
  }
}

//  Get All Products (pagination + filtering + sorting) //
const getProducts = async (req, res) => {
  try {
    // --pagination-- //

    //  Get current page and limit (with default values and safe range) //
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    // products to skip //
    const skip = (page - 1) * limit;

    // --filtering-- //

    const filter = {};

    // Filter by category (exact match) //
    if (req.query.category) filter.category = req.query.category;

    // Filter by price range (min and/or max) //
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = Number(req.query.maxPrice);
    }

    // Full-text search (on name, description, etc.) //
    if (req.query.q) filter.$text = { $search: req.query.q };

    // --sorting --//

    const sortField = req.query.sort || "createdAt";
    const sortOrder = req.query.order === "desc" ? -1 : 1;

    // Run product search and total count at the same time for efficiency //
    const [products, total] = await Promise.all([
      productModel.find(filter)
        .sort({ [sortField]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate("vendor", "storeName email"),
      productModel.countDocuments(filter),
    ]);

  // أضف حالة outOfStock لكل منتج
    const productsWithStatus = products.map(p => ({
      ...p.toObject(),
      outOfStock: p.stock === 0
    }));

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      total,          // total products matching the filter
      page,           // current page
      limit,          // products per page
      totalPages,     // total number of pages
      count: products.length, // number of products in this page
      hasNextPage,
      hasPrevPage,
      products: productsWithStatus // actual products data with outOfStock flag
    })


  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching products", error: error.message, });
  }
};

const getAllProductsAdmin = async (req, res) => {
  try {
    const products = await productModel.find().populate('vendor', 'name email');
    res.status(200).json({
      success: true,
      message: "All products fetched",
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching products",
      error: error.message
    });
  }
};

const getProductByID = async (req, res) => {
  try {
    const { id } = req.params;

    // جلب المنتج مع معلومات البائع
    const product = await productModel.findById(id).populate('vendor', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

        // 🔥 Check stock
    if (product.stock === 0) {
      return res.status(200).json({
        success: true,
        message: "Product is out of stock",
        outOfStock: true,
        data: product
      });
    }

    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching product",
      error: error.message
    });
  }
};


module.exports = { addProduct, updateProduct, deleteProduct, getProducts, getAllProductsAdmin, getProductByID };
