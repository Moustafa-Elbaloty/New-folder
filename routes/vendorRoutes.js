const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { authorizeRole } = require("../middleware/roleMiddleware");

const { createVendor, updateVendor, deleteVendor, getVendorProducts, getVendorProfile, getVendorDashboard } =
    require("../controllers/vendorController");

// إنشاء Vendor جديد
router.post("/create", protect, createVendor);

// جلب بيانات البائع
router.get("/profile", protect, getVendorProfile);

// تحديث بيانات البائع (store name)
router.put("/update", protect, updateVendor);

// حذف حساب البائع
router.delete("/delete", protect, deleteVendor);

// جلب كل منتجات البائع
router.get("/products", protect, getVendorProducts);


//  Vendor Dashboard (Protected Route)
router.get("/dashboard", protect, authorizeRole("vendor"), getVendorDashboard);

module.exports = router;
