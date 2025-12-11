const Cart = require("../models/cartModel");
const Product = require("../models/productModel"); // <-- اضافه هنا

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

    // أضف علامة outOfStock لكل عنصر
    const itemsWithStatus = cart.items.map(item => {
      const prod = item.product;
      const outOfStock = !prod || prod.stock === 0;
      if (prod && prod.price) {
        totalPrice += prod.price * item.quantity;
      }
      totalItems += item.quantity;
      return {
        ...item.toObject ? item.toObject() : item,
        product: prod,
        outOfStock,
      };
    });

    res.json({
      ...cart.toObject(),
      items: itemsWithStatus,
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
    const { userId } = req.params;

    // التحقق من البيانات
    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    let id = req.user.role === "admin" && userId ? userId : req.user.id;  

    // جلب المنتج للتحقق من الستوك
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // لو المنتج خلص
    if (product.stock === 0) {
      return res.status(400).json({ message: "Product is out of stock" });
    }

    // check if user has cart
    let cart = await Cart.findOne({ user: id }).populate(
      "items.product"
    );

    // if cart not exist create one (مع التحقق من الستوك)
    if (!cart) {
      if (quantity > product.stock) {
        return res.status(400).json({
          message: `Only ${product.stock} item(s) available in stock`,
        });
      }
      cart = await Cart.create({
        user: id,
        items: [{ product: productId, quantity }],
      });

      // populate بعد الإنشاء
      cart = await Cart.findById(cart._id).populate("items.product");
    } else {
      // if cart exist check if product already in cart
      const index = cart.items.findIndex((item) => {
        const existingId = item.product && item.product._id ? item.product._id.toString() : item.product.toString();
        return existingId === productId;
      });

      if (index > -1) {
        // product already in cart -> check new qty vs stock
        const newQty = cart.items[index].quantity + quantity;
        if (newQty > product.stock) {
          return res.status(400).json({
            message: `Only ${product.stock} item(s) available in stock. You already have ${cart.items[index].quantity} in cart.`,
          });
        }
        cart.items[index].quantity = newQty;
      } else {
        // product not in cart -> add it (check qty)
        if (quantity > product.stock) {
          return res.status(400).json({
            message: `Only ${product.stock} item(s) available in stock`,
          });
        }
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

    req.io && req.io.emit("cart-updated", {
      message: `Cart updated for user ${id}`,
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
    const { quantity, userId } = req.body; // لو حابب الأدمن يبعت userId في الـ body

    // التحقق من البيانات
    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    // تحديد الـ cart id
    let id = req.user.role === "admin" && userId ? userId : req.user.id;

    // جلب المنتج للتحقق من الستوك
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.stock === 0) {
      return res.status(400).json({ message: "Product is out of stock" });
    }

    if (quantity > product.stock) {
      return res.status(400).json({ message: `Only ${product.stock} item(s) available in stock` });
    }

    // جلب الكارت بناءً على id
    const cart = await Cart.findOne({ user: id });

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

    // Emit لو فيه socket
    req.io && req.io.emit("cart-updated", {
      message: `Cart updated for user ${id}`,
      cartId: cart._id,
      totalItems: updatedCart.items.length,
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
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied: insufficient permissions",
      });
    }

    const { cartId } = req.params;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        message: "Cart ID is required",
      });
    }

    const cart = await Cart.findOneAndDelete({ _id: cartId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Cart deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
