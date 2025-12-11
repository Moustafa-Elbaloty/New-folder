const vendorModel = require("../models/vendorModel");
const userModel = require("../models/userModel");
const productModel = require("../models/productModel");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
// If you use AWS S3 uncomment and configure
// const AWS = require("aws-sdk");
// const s3 = new AWS.S3({ /* credentials / region */ });

//  إنشاء Vendor جديد (Vendor Registration)
const createVendor = async (req, res) => {
  try {
    const { storeName } = req.body;

    if (!storeName) {
      return res.status(400).json({
        success: false,
        message: "Store name is required",
      });
    }

    // Check if this user is already a vendor
    const existingVendor = await vendorModel.findOne({ user: req.user.id });
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "You already have a vendor account",
      });
    }

    // Create Vendor for this user
    const vendor = await vendorModel.create({
      user: req.user.id,
      storeName,
    });

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
    const vendor = await vendorModel
      .findOne({ user: req.user.id })
      .populate("user", "name email role");

    if (!vendor) {
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
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
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
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

// Get all products for this vendor
const getVendorProducts = async (req, res) => {
  try {
    let vendor;

    if (req.user.role === "vendor") {
      // التاجر -> يجيب منتجاته هو
      vendor = await vendorModel.findOne({ user: req.user.id }).populate(
        "products"
      );

      if (!vendor)
        return res
          .status(404)
          .json({ success: false, message: "Vendor not found" });
    } else if (req.user.role === "admin") {
      // الأدمن -> لازم ID في params
      const { id } = req.params;

      vendor = await vendorModel.findById(id).populate("products");

      if (!vendor)
        return res
          .status(404)
          .json({ success: false, message: "Vendor not found" });
    } else {
      return res
        .status(403)
        .json({ success: false, message: "Access denied" });
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
    // 🔹 1. جلب بيانات البائع مع بيانات المستخدم (للحصول على email مثلاً)
    const vendor = await vendorModel
      .findOne({ user: req.user.id })
      .populate("user", "name email");

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    // 🔹 2. جلب المنتجات الخاصة بالبائع — استخدم vendor._id (ليس user id)
    const products = await productModel.find({ vendor: vendor._id });

    // 🔹 3. حساب الإحصائيات
    const totalProducts = products.length;
    const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
    const totalValue = products.reduce(
      (acc, p) => acc + (p.price * (p.stock || 0) || 0),
      0
    );

    // 🔹 4. تجهيز الرد
    res.status(200).json({
      success: true,
      message: `Welcome ${vendor.storeName}!`,
      vendorInfo: {
        name: vendor.storeName,
        email: vendor.user ? vendor.user.email : undefined,
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

    const vendors = await vendorModel.find().populate("user", "name email role");

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

const deleteVendor = async (req, res) => {
  let session;
  try {
    // فقط Admin أو Vendor نفسه يسمح له
    if (req.user.role !== "admin" && req.user.role !== "vendor") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params; // لو admin يحذف أي بائع، لو vendor نفسه: req.user.id
    const vendorId = req.user.role === "vendor" ? req.user.id : id;

    // تحقق من دعم Transaction
    const isReplicaSet = mongoose.connection.client.topology.s.options.replicaSet;
    if (isReplicaSet) session = await mongoose.startSession();

    if (session) session.startTransaction();

    // جلب Vendor
    const vendor = await vendorModel.findById(vendorId).session(session);
    if (!vendor) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    // جلب المنتجات المرتبطة بالـ Vendor
    const products = await productModel.find({ vendor: vendor._id }).session(session);

    // حذف ملفات المنتجات بالتوازي
    await Promise.all(products.map(p => deleteProductFiles(p)));

    // حذف المنتجات من DB
    await productModel.deleteMany({ vendor: vendor._id }).session(session);

    // حذف Vendor نفسه
    await vendorModel.deleteOne({ _id: vendor._id }).session(session);

    // تحويل الدور إلى user
    await userModel.findByIdAndUpdate(vendor.user, { role: "user" }, { session });

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    res.status(200).json({
      success: true,
      message: "Vendor and their products deleted successfully",
      deletedProducts: products.length
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    res.status(500).json({
      success: false,
      message: "Error deleting vendor",
      error: error.message
    });
  }
};

module.exports = {
  getAllVendors,
  
  createVendor,
  getVendorProfile,
  updateVendor,
  deleteVendor,
  getVendorProducts,
  getVendorDashboard,
};
