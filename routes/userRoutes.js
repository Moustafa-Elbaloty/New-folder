const express = require("express");
const router = express.Router();

const { authorizeRole } = require("../middleware/roleMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { getAllUsers, updateUser, deleteUser, getUser } = require("../controllers/userController");

// 🔹 جلب كل المستخدمين (Admin only)
router.get("/getAll", protect, authorizeRole("admin"), getAllUsers);

// 🔹 جلب مستخدم واحد حسب الـ ID (Admin only)
router.get("/getOne/:id", protect, authorizeRole("admin"), getUser);

// 🔹 تحديث مستخدم حسب الـ ID (Admin only)
router.put("/update/:id", protect, authorizeRole("admin"), updateUser);
router.put("/update", protect, authorizeRole("user"), updateUser);


// 🔹 حذف مستخدم حسب الـ ID (Admin only)
router.delete("/delete/:id", protect, authorizeRole("admin"), deleteUser);
router.delete("/delete/", protect, authorizeRole("user"), deleteUser);

module.exports = router;
