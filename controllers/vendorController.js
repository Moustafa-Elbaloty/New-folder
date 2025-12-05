const vendorModel = require("../models/vendorModel");
const userModel = require("../models/userModel");
const productModel = require("../models/productModel");

//  إنشاء Vendor جديد (Vendor Registration)
const createVendor = async (req, res) => {
  try {
    const { storeName } = req.body;

    if (!storeName) {
      return res.status(400).json({ success: false, message: "Store name is required", });
    }

    // Check if this user is already a vendor
    const existingVendor = await vendorModel.findOne({ user: req.user.id });
    if (existingVendor) {
      return res.status(400).json({ success: false, message: "You already have a vendor account", });
    }

    // Create Vendor for this user
    const vendor = await vendorModel.create({ user: req.user.id, storeName, });

    // Update user role to vendor
    await userModel.findByIdAndUpdate(req.user.id, { role: "vendor" });

    res.status(201).json({
      success: true,
      message: "Vendor account created successfully",
      data: vendor,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating vendor",
      error: error.message,
    });
  }
};


//  Get vendor profile (vendor details)
const getVendorProfile = async (req, res) => {
  try {
    const vendor = await vendorModel.findOne({ user: req.user.id }).populate("user", "name email role");

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    res.status(200).json({
      success: true,
      data: vendor,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching vendor profile",
      error: error.message,
    });
  }
};


// Update vendor info (store name)
const updateVendor = async (req, res) => {
  try {
    const { storeName } = req.body;

    const vendor = await vendorModel.findOne({ user: req.user.id });

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    if (storeName) vendor.storeName = storeName;

    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: vendor,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating vendor",
      error: error.message,
    });
  }
};



//  Delete vendor account
const deleteVendor = async (req, res) => {
  try {
    const vendor = await vendorModel.findOne({ user: req.user.id });

    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    await vendorModel.deleteOne({ _id: vendor._id });

    // OPTIONAL: change user role back to user
    await userModel.findByIdAndUpdate(req.user.id, { role: "user" });

    res.status(200).json({
      success: true,
      message: "Vendor account deleted successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting vendor",
      error: error.message,
    });
  }
};



// Get all products for this vendor
const getVendorProducts = async (req, res) => {
  try {
    const vendor = await vendorModel
      .findOne({ user: req.user.id })
      .populate("products"); // << هنا الحل

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found"
      });
    }

    res.status(200).json({
      success: true,
      count: vendor.products.length,
      data: vendor.products,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching vendor products",
      error: error.message,
    });
  }
};


// ✅ Get Vendor Dashboard
const getVendorDashboard = async (req, res) => {
  try {
    const vendorId = req.user.id; // جاي من protect middleware

    // 🔹 1. جلب بيانات البائع
    const vendor = await vendorModel.findOne({ user: req.user.id });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // 🔹 2. جلب المنتجات الخاصة بالبائع
    const products = await productModel.find({ vendor: vendorId });

    // 🔹 3. حساب الإحصائيات
    const totalProducts = products.length;
    const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
    const totalValue = products.reduce((acc, p) => acc + (p.price * (p.stock || 0)), 0);

    // 🔹 4. تجهيز الرد
    res.status(200).json({
      success: true,
      message: `Welcome ${vendor.storeName}!`,
      vendorInfo: {
        name: vendor.storeName,
        email: vendor.email,
        country: vendor.country,
      },
      stats: {
        totalProducts,
        totalStock,
        totalValue,
      },
      products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching vendor dashboard",
      error: error.message,
    });
  }
};

const getAllVendors = async (req, res) => {
  try {
    if (req.user.role !== "admin") 
      return res.status(403).json({ message: "Access denied" });

    const vendors = await vendorModel
      .find()
      .populate("user", "name email role");

    res.status(200).json({
      success: true,
      message: "All vendors fetched successfully",
      data: vendors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching vendors",
      error: error.message,
    });
  }
};

const deleteAnyVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await vendorModel.findById(id);
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    await vendorModel.deleteOne({ _id: id });
    await userModel.findByIdAndUpdate(vendor.user, { role: "user" });

    res.status(200).json({ success: true, message: "Vendor deleted by admin" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting vendor", error: error.message });
  }
};
const getAnyVendorProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await vendorModel.findById(id).populate("products");
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" });

    res.status(200).json({ success: true, count: vendor.products.length, data: vendor.products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching vendor products", error: error.message });
  }
};

module.exports = {getAllVendors, deleteAnyVendor, getAnyVendorProducts,  createVendor, getVendorProfile, updateVendor, deleteVendor, getVendorProducts, getVendorDashboard }
