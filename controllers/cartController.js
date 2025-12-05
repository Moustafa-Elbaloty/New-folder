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

    req.io.emit("cart-updated", {
      message: `Cart updated for user ${req.user.id}`,
      cartId: cart._id,
      totalItems: cart.items.length,
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
    req.io.emit("cart-item-removed", {
      message: `Item removed from cart for user ${req.user.id}`,
      cartId: cart._id,
      totalItems: cart.items.length,
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

exports.getAllCarts = async (req, res) => {
  try {
    if(req.user.role !== "admin"){
      return  res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
    }
    const carts = await Cart.find()
      .populate("user", "name email role")          // معلومات المستخدم
      .populate("items.product", "name price image") // معلومات المنتجات
      .lean();
    const cartsWithTotal = carts.map(cart => {
      const totalAmount = cart.items.reduce((sum, item) => {
        return sum + (item.product?.price || 0) * item.quantity;
      }, 0);
      return { ...cart._doc, totalAmount };
    });

    res.status(200).json({
      success: true,
      message: "All carts fetched successfully",
      data: cartsWithTotal,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Server error while fetching carts",
      error: err.message,
    });
  }
};


exports.deleteCart = async (req, res) => {
  try {
    if(req.user.role !== "admin"){
      return  res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
    }
    const { userId } = req.params;
    const cart = await Cart.findOneAndDelete({ user: userId });

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    res.status(200).json({ success: true, message: "Cart deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
