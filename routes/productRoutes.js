const express = require("express")
const router = express.Router();
const { addProduct, updateProduct, deleteProduct, getProducts } = require("../controllers/productController")
const { protect } = require("../middleware/authMiddleware");

// vendor only //
router.post("/addProduct", protect, addProduct)
router.put("/:id", protect, updateProduct)
router.delete("/:id", protect, deleteProduct)

router.get("/", getProducts)

module.exports = router;