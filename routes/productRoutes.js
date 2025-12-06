const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const {
  addProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductByID,
} = require("../controllers/productController");
const { protect } = require("../middleware/authMiddleware"); // جمعناهم هنا
const { authorizeRole } = require("../middleware/roleMiddleware");

// ---------------- Multer setup ----------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "..", "uploads")); // ../uploads
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    cb(null, Date.now() + "-" + base + ext);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only images are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
// -----------------------------------------------

// إضافة منتج مع صورة: protect -> multer -> controller
router.post("/addProduct", protect, upload.single("image"), addProduct);

// تحديث المنتج — image اختياري (نضيف multer هنا)
router.put("/:id", protect, upload.single("image"), updateProduct);

// حذف المنتج
router.delete("/:id", protect, deleteProduct);

// Get single product by id (public or protected? هنا استخدمت protect+verifyAdmin سابقًا، لكن عادة GET by id يكون public)
// لو عايزها عامة استبدل السطر التالي بـ: router.get("/:id", getProductByID);
router.get("/:id", getProductByID);

// قائمة المنتجات العامة
router.get("/", getProducts);

module.exports = router;
