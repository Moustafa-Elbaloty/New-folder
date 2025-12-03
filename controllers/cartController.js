const Cart = require("../models/cartModel");
const Product = require("../models/productModel");


// ============================
//       GET CART
// ============================
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.json({
        items: [],
        totalItems: 0,
        totalPrice: 0,
      });
    }

    // حساب الـ total بناءً على الكمية والسعر
    let totalPrice = 0;
    let totalItems = 0;

    cart.items.forEach((item) => {
      // item.product قد يكون null (محذوف) فنتأكد
      if (item.product && typeof item.product.price === "number") {
        const itemTotal = item.product.price * item.quantity;
        totalPrice += itemTotal;
        totalItems += item.quantity;
      }
    });

    res.json({
      ...cart.toObject(),
      totalPrice: Number(totalPrice.toFixed(2)), // كـ Number متناسق مع الباقي
      totalItems,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ============================
//       ADD TO CART
// ============================
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    if (!productId) return res.status(400).json({ message: "Product ID is required" });
    if (!quantity || quantity < 1) return res.status(400).json({ message: "Quantity must be at least 1" });

    // جلب المنتج والتحقق من وجوده و المخزون
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (quantity > product.stock) {
      return res.status(400).json({ message: `Only ${product.stock} item(s) available in stock` });
    }

    // جلب الكارت (مع populated products)
    let cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart) {
      cart = await Cart.create({ user: req.user.id, items: [{ product: productId, quantity }] });
      cart = await Cart.findById(cart._id).populate("items.product");
    } else {
      // إيجاد المنتج في الكارت (التعامل مع populated or ObjectId)
      const index = cart.items.findIndex(item => {
        const existingId = item.product && item.product._id ? item.product._id.toString() : item.product.toString();
        return existingId === productId;
      });

      if (index > -1) {
        const newQty = cart.items[index].quantity + quantity;
        if (newQty > product.stock) {
          return res.status(400).json({
            message: `Only ${product.stock} item(s) available in stock. You already have ${cart.items[index].quantity} in cart.`,
          });
        }
        cart.items[index].quantity = newQty;
      } else {
        cart.items.push({ product: productId, quantity });
      }

      await cart.save();
      cart = await Cart.findById(cart._id).populate("items.product");
    }

    // حساب المجموع
    let totalPrice = 0;
    let totalItems = 0;
    cart.items.forEach((item) => {
      if (item.product && item.product.price) {
        totalPrice += item.product.price * item.quantity;
        totalItems += item.quantity;
      }
    });

    res.json({ ...cart.toObject(), totalPrice: Number(totalPrice.toFixed(2)), totalItems });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ============================
//    UPDATE CART ITEM QUANTITY
// ============================
exports.updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) return res.status(400).json({ message: "Quantity must be at least 1" });

    // جلب المنتج للتحقق من الستوك
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (quantity > product.stock) {
      return res.status(400).json({ message: `Only ${product.stock} item(s) available in stock` });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    // إيجاد العنصر في الكارت (تعامل مع populated or ObjectId)
    const item = cart.items.find(it => {
      const existingId = it.product && it.product._id ? it.product._id.toString() : it.product.toString();
      return existingId === productId;
    });

    if (!item) return res.status(404).json({ message: "Product not found in cart" });

    item.quantity = quantity;
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate("items.product");

    let totalPrice = 0;
    let totalItems = 0;
    updatedCart.items.forEach((it) => {
      if (it.product && it.product.price) {
        totalPrice += it.product.price * it.quantity;
        totalItems += it.quantity;
      }
    });

    res.json({ ...updatedCart.toObject(), totalPrice: Number(totalPrice.toFixed(2)), totalItems });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ============================
//     REMOVE ITEM FROM CART
// ============================
exports.removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $pull: { items: { product: productId } } },
      { new: true }
    ).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.json({
        items: [],
        totalItems: 0,
        totalPrice: 0,
      });
    }

    // حساب الـ total بعد الحذف
    let totalPrice = 0;
    let totalItems = 0;

    cart.items.forEach((item) => {
      if (item.product && typeof item.product.price === "number") {
        const itemTotal = item.product.price * item.quantity;
        totalPrice += itemTotal;
        totalItems += item.quantity;
      }
    });

    res.json({
      ...cart.toObject(),
      totalPrice: Number(totalPrice.toFixed(2)),
      totalItems,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
