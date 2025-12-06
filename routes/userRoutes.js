const express = require("express");
const router = express.Router();

const { authorizeRole } = require("../middleware/roleMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { updateUser, deleteUser } = require("../controllers/userController");

// 🔹 تحديث مستخدم
router.put("/update", protect, authorizeRole("user"), updateUser);

// 🔹 حذف مستخدم
router.delete("/delete/", protect, authorizeRole("user"), deleteUser);

module.exports = router;

