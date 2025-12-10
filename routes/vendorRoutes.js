const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRole } = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadImageMiddleware"); // <- multer (يقبل الصور + pdf)

const {
  createVendor,
  updateVendor,
  deleteVendor,
  getVendorProducts,
  getVendorProfile,
  getVendorDashboard,
  getAllVendors,
  deleteAnyVendor,
} = require("../controllers/vendorController");

// =====================
// Vendor / User Routes
// =====================

// إنشاء Vendor جديد (لـ user بعد التسجيل)
// ملاحظة: أسماء الحقول فى الـ frontend لازم تكون مطابقة: idCard, commercialReg, otherDocs
router.post(
  "/create",
  protect,
  upload.fields([
    { name: "idCard", maxCount: 1 },
    { name: "commercialReg", maxCount: 1 },
    { name: "otherDocs", maxCount: 5 },
  ]),
  createVendor
);

// جلب بيانات البائع الحالي
router.get("/profile", protect, getVendorProfile);

// تحديث بيانات البائع الحالي (store name + إمكانية رفع مستندات إضافية)
router.put(
  "/update",
  protect,
  upload.fields([
    { name: "idCard", maxCount: 1 },
    { name: "commercialReg", maxCount: 1 },
    { name: "otherDocs", maxCount: 5 },
  ]),
  updateVendor
);

// حذف حساب البائع الحالي
router.delete("/delete", protect, deleteVendor);

// جلب كل منتجات البائع الحالي
router.get("/products", protect, getVendorProducts);

// =====================
// Vendor Dashboard
// =====================

// Dashboard خاص بالبائع فقط
router.get("/dashboard", protect, authorizeRole("vendor"), getVendorDashboard);

// =====================
// Admin Routes for Vendors
// =====================

// جلب كل البائعين (admin)
router.get("/admin", protect, authorizeRole("admin"), getAllVendors);

// حذف بائع بواسطة الأدمن (admin)
router.delete("/admin/:id", protect, authorizeRole("admin"), deleteAnyVendor);

// جلب منتجات بائع محدد بواسطة الأدمن (admin)
// ملاحظة: الدالة getVendorProducts تقبل id في params إذا كان الـ role = admin
router.get("/admin/:id/products", protect, authorizeRole("admin"), getVendorProducts);

module.exports = router;
