const Cart = require("../models/cartModel");

// ============================
//       GET CART
// ============================
exports.getCart = async (req, res) => {
  try {
    let id;

    // 🧠 تحديد الـ ID بناءً على الدور
    if (req.user.role === "admin") {
      // لو عايزين admin يجيب cart لأي user، ممكن ياخد id من params
      id = req.params.userId;
      if (!id) {
        return res.status(400).json({ message: "User ID is required for admin." });
      }
    } else if(req.user.role === "user") {
      id = req.user.id;
    }

    const cart = await Cart.findOne({ user: id }).populate("items.product");

    if (!cart || !cart.items || cart.items.length === 0) {
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
    const { userId } = req.params; // للأدمن

    if (!productId) return res.status(400).json({ message: "Product ID is required" });
    if (!quantity || quantity < 1) return res.status(400).json({ message: "Quantity must be at least 1" });

    // تحديد الـ ID بناءً على الدور
    let id = req.user.role === "admin" && userId ? userId : req.user.id;

    let cart = await Cart.findOne({ user: id }).populate("items.product");

    if (!cart) {
      cart = await Cart.create({ user: id, items: [{ product: productId, quantity }] });
      cart = await Cart.findById(cart._id).populate("items.product");
    } else {
      const index = cart.items.findIndex(item => item.product.toString() === productId);
      if (index > -1) cart.items[index].quantity += quantity;
      else cart.items.push({ product: productId, quantity });
      await cart.save();
      cart = await Cart.findById(cart._id).populate("items.product");
    }

    let totalPrice = 0, totalItems = 0;
    cart.items.forEach(item => {
      if (item.product && item.product.price) {
        totalPrice += item.product.price * item.quantity;
        totalItems += item.quantity;
      }
    });

    req.io.emit("cart-updated", {
      message: `Cart updated for user ${id}`,
      cartId: cart._id,
      totalItems: cart.items.length,
    });

    res.json({ ...cart.toObject(), totalPrice: totalPrice.toFixed(2), totalItems });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ============================
//    UPDATE CART ITEM QUANTITY
// ============================
exports.updateCartItem = async (req, res) => {
  try {
    const { productId, userId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) return res.status(400).json({ message: "Quantity must be at least 1" });

    const id = req.user.role === "admin" && userId ? userId : req.user.id;

    const cart = await Cart.findOne({ user: id });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const item = cart.items.find(item => item.product.toString() === productId);
    if (!item) return res.status(404).json({ message: "Product not found in cart" });

    item.quantity = quantity;
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate("items.product");

    let totalPrice = 0, totalItems = 0;
    updatedCart.items.forEach(item => {
      if (item.product && item.product.price) {
        totalPrice += item.product.price * item.quantity;
        totalItems += item.quantity;
      }
    });

    res.json({ ...updatedCart.toObject(), totalPrice: totalPrice.toFixed(2), totalItems });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ============================
//     REMOVE ITEM FROM CART
// ============================
exports.removeFromCart = async (req, res) => {
  try {
    const { productId, userId } = req.params; // هنا خدنا userId من params
    const id = req.user.role === "admin" && userId ? userId : req.user.id;

    const cart = await Cart.findOneAndUpdate(
      { user: id },
      { $pull: { items: { product: productId } } },
      { new: true }
    ).populate("items.product");

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.json({ items: [], totalItems: 0, totalPrice: 0 });
    }

    let totalPrice = 0, totalItems = 0;
    cart.items.forEach(item => {
      if (item.product && item.product.price) {
        totalPrice += item.product.price * item.quantity;
        totalItems += item.quantity;
      }
    });

    req.io.emit("cart-item-removed", {
      message: `Item removed from cart for user ${id}`,
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
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied: insufficient permissions"
      });
    }

    const carts = await Cart.find()
      .populate("user", "name email role")
      .populate("items.product", "name price image")
      .lean();

    const cartsWithTotal = carts.map(cart => {
      const items = cart.items || [];
      const totalAmount = items.reduce((sum, item) => {
        return sum + (item.product?.price || 0) * item.quantity;
      }, 0);
      return { ...cart._doc, totalAmount };
    });

    res.status(200).json({
      success: true,
      carts: cartsWithTotal
    });

  } catch (err) {
    console.error("Error fetching carts:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching carts",
      error: err.message
    });
  }
};



exports.deleteCart = async (req, res) => {
  try {
    if(req.user.role !== "admin"){
      return  res.status(403).json({ success: false, message: "Access denied: insufficient permissions" });
    }
    const { cartId } = req.params.cartId;
if (!cartId) {
  return res.status(400).json({ success: false, message: "Cart ID is required" });
}
    
    const cart = await Cart.findOneAndDelete(cartId );

    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    res.status(200).json({ success: true, message: "Cart deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
