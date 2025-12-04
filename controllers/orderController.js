const Order = require("../models/orderModel");
const Cart = require("../models/cartModel");

exports.createOrder = async (req, res) => {
  try {
    const { paymentMethod, vendorId } = req.body;

    if (!paymentMethod || !["cash", "stripe", "paypal"].includes(paymentMethod)) {
      return res.status(400).json({
        message: "Invalid payment method. Must be: cash, stripe, or paypal",
      });
    }

    const cart = await Cart.findOne({ user: req.user.id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const validItems = cart.items.filter((item) => item.product !== null);

    if (validItems.length === 0) {
      cart.items = [];
      await cart.save();
      return res.status(400).json({
        message: "All products in cart are no longer available. Cart has been cleared.",
      });
    }

    if (validItems.length < cart.items.length) {
      cart.items = validItems.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
      }));
      await cart.save();
    }

    // 🟡 CHECK STOCK BEFORE CREATING ORDER
    for (const item of validItems) {
      const available = item.product.stock;
      const requested = item.quantity;

      if (requested > available) {
        return res.status(400).json({
          message: `Not enough stock for product "${item.product.name}". Available: ${available}, Requested: ${requested}`,
        });
      }
    }

    // إنشاء orderItems
    const orderItems = validItems.map((item) => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.price,
      totalItemPrice: item.product.price * item.quantity,
    }));

    const totalPrice = orderItems.reduce((total, item) => total + item.totalItemPrice, 0);

    const order = await Order.create({
      user: req.user.id,
      vendor: vendorId || null,
      items: orderItems,
      paymentMethod,
      totalPrice,
    });

    // 🟢 DECREASE STOCK AFTER ORDER
    for (const item of validItems) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity }
      });
    }

    // تفريغ الكارت
    cart.items = [];
    await cart.save();

    res.json({
      message: "Order created successfully",
      order,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// 🟢 Get all orders for current user
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product")
      .populate("vendor");

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟢 Get single order
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id,
    })
      .populate("items.product")
      .populate("vendor");

    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🟢 Cancel order (only pending) + Restore Stock
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("items.product");

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus !== "pending") {
      return res.status(400).json({
        message: "Only pending orders can be cancelled",
      });
    }

    // 🟡 Restore product stock
    for (const item of order.items) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product._id, {
          $inc: { stock: item.quantity } // رجّع ال stock
        });
      }
    }

    // 🟢 Update order status
    order.orderStatus = "cancelled";
    await order.save();

    res.json({
      message: "Order cancelled and stock restored",
      order,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🟢 Vendor/Admin update status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // التحقق من الحالة المسموحة
    const allowedStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${allowedStatuses.join(
          ", "
        )}`,
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) return res.status(404).json({ message: "Order not found" });

    order.orderStatus = status;
    await order.save();

    req.io.emit("new-order", {
      message: `New order by ${req.user.name}`,
      orderId: order._id,
      amount: order.amount,
    });
    
    res.json({ message: "Order status updated", order });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
