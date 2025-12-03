const express = require("express");
const router = express.Router();

// استخدم الكونترولر الصحيح من مجلد controllers
const {
  getCart,
  addToCart,
  removeFromCart,
  updateCartItem,
} = require("../controllers/cartController");

// استخدم ميدل وير الحماية الموحد
const { protect } = require("../middleware/authMiddleware");

// GET /api/cart/
router.get("/", protect, getCart);

// POST /api/cart/add
router.post("/add", protect, addToCart);

// PUT /api/cart/update/:productId
router.put("/update/:productId", protect, updateCartItem);

// DELETE /api/cart/remove/:productId
router.delete("/remove/:productId", protect, removeFromCart);

module.exports = router;
