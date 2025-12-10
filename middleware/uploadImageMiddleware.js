const multer = require("multer");
const path = require("path");
const fs = require("fs");

// إنشاء فولدر uploads لو مش موجود
const uploadPath = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });

// التخزين
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    cb(null, Date.now() + "-" + base + ext);
  }
});

// فلترة حسب الـ fieldname
const fileFilter = (req, file, cb) => {
  const mime = file.mimetype;
  const ext = path.extname(file.originalname).toLowerCase();

  // ========== 1) idCard → لازم Image فقط ==========
  if (file.fieldname === "idCard") {
    if (!mime.startsWith("image/")) {
      return cb(new Error("idCard must be an Image"), false);
    }
    if (![".jpg", ".jpeg", ".png"].includes(ext)) {
      return cb(new Error("idCard only accepts JPG/PNG"), false);
    }
    return cb(null, true);
  }

  // ========== 2) commercialReg → لازم PDF فقط ==========
  if (file.fieldname === "commercialReg") {
    if (mime !== "application/pdf") {
      return cb(new Error("commercialReg must be a PDF file only"), false);
    }
    if (ext !== ".pdf") {
      return cb(new Error("commercialReg extension must be .pdf"), false);
    }
    return cb(null, true);
  }

  // ========== 3) otherDocs → PDF أو صورة ==========
  if (file.fieldname === "otherDocs") {
    const allowedExt = [".jpg", ".jpeg", ".png", ".pdf"];
    const allowedMime = ["image/jpeg", "image/png", "application/pdf"];

    if (!allowedMime.includes(mime)) {
      return cb(new Error("otherDocs must be Image or PDF"), false);
    }

    if (!allowedExt.includes(ext)) {
      return cb(new Error("otherDocs invalid file extension"), false);
    }

    return cb(null, true);
  }

  // أي حقل غير معروف
  return cb(new Error("Invalid upload field"), false);
};

// الحجم 10MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

module.exports = upload;
