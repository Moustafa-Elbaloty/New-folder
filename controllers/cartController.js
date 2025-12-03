const Cart = require("../models/cartModel");

// ============================
//       GET CART
// ============================
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product"
    );

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
      if (item.product && item.product.price) {
        const itemTotal = item.product.price * item.quantity;
        totalPrice += itemTotal;
        totalItems += item.quantity;
      }
    });

    res.json({
      ...cart.toObject(),
      totalPrice: totalPrice.toFixed(2),
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

    // التحقق من البيانات
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    // check if user has cart
    let cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product"
    );

    // if cart not exist create one
    if (!cart) {
      cart = await Cart.create({
        user: req.user.id,
        items: [{ product: productId, quantity }],
      });

      // populate بعد الإنشاء
      cart = await Cart.findById(cart._id).populate("items.product");
    } else {
      // if cart exist check if product already in cart
      const index = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );

      if (index > -1) {
        // product already in cart -> update qty
        cart.items[index].quantity += quantity;
      } else {
        // product not in cart -> add it
        cart.items.push({ product: productId, quantity });
      }

      await cart.save();
      // populate بعد الحفظ
      cart = await Cart.findById(cart._id).populate("items.product");
    }

    // حساب الـ total
    let totalPrice = 0;
    let totalItems = 0;

    cart.items.forEach((item) => {
      if (item.product && item.product.price) {
        const itemTotal = item.product.price * item.quantity;
        totalPrice += itemTotal;
        totalItems += item.quantity;
      }
    });

    res.json({
      ...cart.toObject(),
      totalPrice: totalPrice.toFixed(2),
      totalItems,
    });
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

    // التحقق من البيانات
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const cart = await Cart.findOne({ user: req.user.id });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // البحث عن المنتج في الكارت
    const item = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({ message: "Product not found in cart" });
    }

    // تحديث الكمية
    item.quantity = quantity;
    await cart.save();

    // populate بعد الحفظ
    const updatedCart = await Cart.findById(cart._id).populate("items.product");

    // حساب الـ total
    let totalPrice = 0;
    let totalItems = 0;

    updatedCart.items.forEach((item) => {
      if (item.product && item.product.price) {
        const itemTotal = item.product.price * item.quantity;
        totalPrice += itemTotal;
        totalItems += item.quantity;
      }
    });

    res.json({
      ...updatedCart.toObject(),
      totalPrice: totalPrice.toFixed(2),
      totalItems,
    });
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
      if (item.product && item.product.price) {
        const itemTotal = item.product.price * item.quantity;
        totalPrice += itemTotal;
        totalItems += item.quantity;
      }
    });

    res.json({
      ...cart.toObject(),
      totalPrice: totalPrice.toFixed(2),
      totalItems,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
