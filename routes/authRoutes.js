const express = require("express");
const router = express.Router();
const { registerUser, loginUser, registerUserWithEmail } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// 🧍‍♂️ تسجيل مستخدم جديد
router.post("/register", registerUser, registerUserWithEmail);

// 🔑 تسجيل الدخول
router.post("/login", loginUser);

// 👤 راوت محمي (فقط للمستخدم اللي معاه توكن)
router.get("/profile", protect, (req, res) => {
  res.json({
    message: `مرحبًا يا ${req.user.name} `,
    email: req.user.email,
    role: req.user.role,
  });
});

module.exports = router;
