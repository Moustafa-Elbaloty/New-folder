const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRole } = require("../middleware/roleMiddleware");
const {
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorProducts,
  getVendorProfile,
  getVendorDashboard,
} = require("../controllers/vendorController");

// =====================
// Vendor / User Routes
// =====================

// إنشاء Vendor جديد (لـ user بعد التسجيل)
router.post("/create", protect, createVendor);

// جلب بيانات البائع الحالي
router.get("/profile", protect, getVendorProfile);

// تحديث بيانات البائع الحالي (store name)
router.put("/update", protect, updateVendor);

// حذف حساب البائع الحالي
router.delete("/delete", protect, deleteVendor);

// جلب كل منتجات البائع الحالي
router.get("/products", protect, getVendorProducts);

// =====================
// Vendor Dashboard
// =====================

// Dashboard خاص بالبائع فقط
router.get("/dashboard", protect, authorizeRole("vendor"), getVendorDashboard);

module.exports = router;
