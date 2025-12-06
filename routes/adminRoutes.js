const express = require("express");
const router = express.Router();

const {getAllProductsAdmin} = require("../controllers/productController");

const { getCart, addToCart, removeFromCart, updateCartItem, getAllCarts, deleteCart} = require("../controllers/cartController");

const {getAllOrders} = require("../controllers/orderController");

const {getAllPayments,  getAdminDashboardStats} = require("../controllers/paymentController");

const { getAllUsers, updateUser, deleteUser, getUser } = require("../controllers/userController");

const { getAllVendors, deleteAnyVendor, getVendorProducts} = require("../controllers/vendorController");

const { authorizeRole } = require("../middleware/roleMiddleware");
const { protect } = require("../middleware/authMiddleware");

// =======================================================
// 🛒 CART ROUTES
// =======================================================

// REQ: GET /api/admin/cart/:userId
router.get("/cart/:userId", protect, authorizeRole("admin"), getCart);

// REQ: GET /api/admin/cart/
router.get("/cart/", protect, authorizeRole("admin"), getAllCarts);

// REQ: DELETE /api/admin/cart/delete/:cartId
router.delete("/cart/delete/:cartId", protect, authorizeRole("admin"), deleteCart);

// REQ: POST /api/admin/cart/add/:userId
router.post("/cart/add/:userId", protect, authorizeRole("admin"), addToCart);

// REQ: PUT /api/admin/cart/update/:productId/:userId
router.put( "/cart/update/:productId/:userId", protect, authorizeRole("admin"), updateCartItem);

// REQ: DELETE /api/admin/cart/remove/:productId/:userId
router.delete( "/cart/remove/:productId/:userId", protect, authorizeRole("admin"), removeFromCart);


// =======================================================
// 📦 ORDER ROUTES
// =======================================================

// REQ: GET /api/admin/orders
router.get("/orders", protect, authorizeRole("admin"), getAllOrders);


// =======================================================
// 💳 PAYMENT ROUTES
// =======================================================

// REQ: GET /api/admin/payments/all
router.get("/payments/all", protect, authorizeRole("admin"), getAllPayments);

// REQ: GET /api/admin/stats?vendorId= &userId=
router.get("/stats", protect, authorizeRole("admin"), getAdminDashboardStats);


// =======================================================
// 🛍️ PRODUCT ROUTES
// =======================================================

// REQ: GET /api/admin/products
router.get("/products", protect, authorizeRole("admin"), getAllProductsAdmin);


// =======================================================
// 👤 USER ROUTES
// =======================================================

// REQ: GET /api/admin/users
router.get("/users", protect, authorizeRole("admin"), getAllUsers);

// REQ: GET /api/admin/getUser/:id
router.get("/getUser/:id", protect, authorizeRole("admin"), getUser);

// REQ: PUT /api/admin/updateUser/:id
router.put("/updateUser/:id", protect, authorizeRole("admin"), updateUser);

// REQ: DELETE /api/admin/deleteUser/:id
router.delete("/deleteUser/:id", protect, authorizeRole("admin"), deleteUser);


// =======================================================
// 🏪 VENDOR ROUTES
// =======================================================

// REQ: GET /api/admin/allVendors
router.get("/allVendors", protect, authorizeRole("admin"), getAllVendors);

// REQ: DELETE /api/admin/deleteVendor/:id
router.delete("/deleteVendor/:id", protect, authorizeRole("admin"), deleteAnyVendor);

// REQ: GET /api/admin/vendors/products/:id
router.get( "/vendors/products/:id", protect, authorizeRole("admin"), getVendorProducts);


module.exports = router;
