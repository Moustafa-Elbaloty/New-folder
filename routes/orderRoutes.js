const express = require("express");
const router = express.Router();

// استدعاء الكونترولر الصحيح
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  getAllOrders
} = require("../controllers/orderController");
const {authorizeRole} = require("../middleware/roleMiddleware");

// ميدل وير الحماية الموحد
const { protect } = require("../middleware/authMiddleware");

// POST /api/orders/create
router.post("/create", protect, createOrder);

// GET /api/orders/myorders
router.get("/myorders", protect, getMyOrders);

// PUT /api/orders/cancel/:id
router.put("/cancel/:id", protect, cancelOrder);

// PUT /api/orders/:id/status
router.put("/:id/status", protect, updateOrderStatus);

// GET /api/orders/:id
router.get("/:id", protect, getOrderById);

// Admin routes
// GET /api/orders/
router.get("/orders", protect, authorizeRole("admin"), getAllOrders);
// GET /api/orders/:id
router.get("/order/:id", protect, authorizeRole("admin"), getOrderById); 
module.exports = router;
