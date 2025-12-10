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

// helper: حذف ملفات المنتج (مثال)
// تعديل هذا الجزء حسب طريقة تخزين الصور/الملفات عندك (S3, Cloudinary, local, ...).
const deleteProductFiles = async (product) => {
  // مثال: لو المنتج عنده حقل images = [{ url, key }] حيث key هو مفتاح S3 أو اسم الملف
  if (!product) return;
  try {
    if (product.images && Array.isArray(product.images)) {
      for (const img of product.images) {
        // مثال حذف ملف محلي
        // if (img.path) {
        //   const filePath = path.join(__dirname, "..", "uploads", img.path);
        //   if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        // }

        // مثال حذف من S3 (uncomment بعد إعداد s3 client)
        // if (img.key) {
        //   await s3.deleteObject({ Bucket: "YOUR_BUCKET", Key: img.key }).promise();
        // }

        // أو ضع هنا أي منطق آخر لحذف الملفات
      }
    }

    // إذا تستخدم تخزين واحد للـ product مثل product.image (string) عدّل المنطق أعلاه
  } catch (err) {
    // لا تفشل الحذف الكلي لو فشل حذف ملف واحد — يمكنك تسجيل الخطأ
    console.error("Error deleting product files:", err.message);
  }
};

//  Delete vendor account (vendor deletes own account)
const deleteVendor = async (req, res) => {
  // نستخدم transaction لو كانت بيئة MongoDB تدعمها (replica set)
  const session = await mongoose.startSession();
  try {
    // يمكنك إلغاء الـ transaction إذا كنت لا تستخدم replica set
    session.startTransaction();

    const vendor = await vendorModel
      .findOne({ user: req.user.id })
      .session(session);

    if (!vendor) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    // جلب المنتجات المرتبطة بالـ vendor (للتعامل مع الملفات قبل الحذف)
    const products = await productModel
      .find({ vendor: vendor._id })
      .session(session);

    // احذف ملفات كل منتج (S3/local...) — هذه العملية لا تعتمد على الـ session لأنها خارج Mongo
    for (const p of products) {
      // لو عندك حاجة تعتمد على الشبكة أو S3: await deleteFromS3(p)
      await deleteProductFiles(p);
    }

    // احذف سجلات المنتجات من DB
    await productModel.deleteMany({ vendor: vendor._id }).session(session);

    // احذف حساب الـ vendor
    await vendorModel.deleteOne({ _id: vendor._id }).session(session);

    // ارجع دور المستخدم إلى "user"
    await userModel
      .findByIdAndUpdate(req.user.id, { role: "user" }, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Vendor account and their products deleted successfully",
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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

const deleteAnyVendor = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    session.startTransaction();

    const { id } = req.params;
    const vendor = await vendorModel.findById(id).session(session);
    if (!vendor) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ success: false, message: "Vendor not found" });
    }

    // جلب منتجات البائع لحذف ملفاتها ثم السجلات
    const products = await productModel.find({ vendor: vendor._id }).session(
      session
    );

    for (const p of products) {
      await deleteProductFiles(p);
    }

    await productModel.deleteMany({ vendor: vendor._id }).session(session);

    await vendorModel.deleteOne({ _id: id }).session(session);

    await userModel.findByIdAndUpdate(vendor.user, { role: "user" }, { session });

    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json({ success: true, message: "Vendor deleted by admin" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({
      success: false,
      message: "Error deleting vendor",
      error: error.message,
    });
  }
};

module.exports = {
  getAllVendors,
  deleteAnyVendor,
  createVendor,
  getVendorProfile,
  updateVendor,
  deleteVendor,
  getVendorProducts,
  getVendorDashboard,
};
