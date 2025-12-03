const Stripe = require("stripe");
const dotenv = require("dotenv");

dotenv.config(); // تحميل متغيرات البيئة بدري داخل الملف نفسه كضمان إضافي

let stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log("✅ Stripe Initialized Successfully");
} else {
  console.error("❌ STRIPE_SECRET_KEY is missing. Check your .env file");
}

const Payment = require("../models/paymentModel");
const Order = require("../models/orderModel");

// ============================
//    GET USER PAYMENTS
// ============================
exports.getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate("order")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: payments.length,
      payments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
//    GET PAYMENT BY ID
// ============================
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate("order");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    res.json({
      success: true,
      payment,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
//    CONFIRM STRIPE PAYMENT (Webhook أو Manual)
// ============================
exports.confirmStripePayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: "Payment Intent ID is required" });
    }

    const payment = await Payment.findOne({
      transactionId: paymentIntentId,
      method: "stripe",
    }).populate("order");

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      payment.status = "paid";
      await payment.save();

      if (payment.order) {
        payment.order.paymentStatus = "paid";
        payment.order.orderStatus = "processing";
        await payment.order.save();
      }

      res.json({
        message: "Payment confirmed successfully",
        payment,
        order: payment.order,
      });
    } else {
      res.json({
        message: "Payment is still pending",
        paymentStatus: paymentIntent.status,
        payment,
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
//    Stripe Init Payment (Visa/Master)
// ============================
exports.stripeInit = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({
        message: "Stripe is not configured. Please check your .env file",
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        message: "This order has already been paid",
      });
    }

    if (order.paymentMethod !== "stripe") {
      return res.status(400).json({
        message: "This order is not set for Stripe payment",
      });
    }

    const existingPayment = await Payment.findOne({
      order: orderId,
      method: "stripe",
      status: { $in: ["paid", "pending"] },
    });

    if (existingPayment && existingPayment.status === "pending" && existingPayment.transactionId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(existingPayment.transactionId);
        return res.json({
          message: "Stripe payment already initialized",
          clientSecret: paymentIntent.client_secret,
          payment: existingPayment,
        });
      } catch (err) { /* continue to create new one */ }

    } else if (existingPayment && existingPayment.status === "paid") {
      return res.status(400).json({
        message: "This order has already been paid",
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.totalPrice * 100),
      currency: "usd",
      payment_method_types: ["card"],
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.id.toString(),
      },
    });

    const payment = await Payment.create({
      user: req.user.id,
      order: orderId,
      method: "stripe",
      amount: order.totalPrice,
      status: "pending",
      transactionId: paymentIntent.id,
    });

    res.json({
      message: "Stripe payment initialized",
      clientSecret: paymentIntent.client_secret,
      payment,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
//    PayPal Simulation
// ============================
exports.paypalPay = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentStatus === "paid") {
      return res.status(400).json({
        message: "This order has already been paid",
      });
    }

    const transactionId = "PAYPAL-" + Date.now();

    const payment = await Payment.create({
      user: req.user.id,
      order: orderId,
      method: "paypal",
      amount: order.totalPrice,
      status: "paid",
      transactionId,
    });

    order.paymentStatus = "paid";
    order.orderStatus = "processing";
    await order.save();

    res.json({
      message: "PayPal payment successful",
      payment,
      order,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ============================
//    Cash On Delivery
// ============================
exports.cashPay = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "Order ID is required" });
    }

    const order = await Order.findOne({
      _id: orderId,
      user: req.user.id,
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.paymentMethod !== "cash") {
      return res.status(400).json({
        message: "This order is not set for cash payment",
      });
    }

    const existingPayment = await Payment.findOne({
      order: orderId,
      method: "cash",
    });

    if (existingPayment) {
      return res.json({
        message: "Cash payment already registered",
        payment: existingPayment,
        order,
      });
    }

    const payment = await Payment.create({
      user: req.user.id,
      order: orderId,
      method: "cash",
      amount: order.totalPrice,
      status: "pending",
    });

    order.paymentStatus = "pending";
    order.orderStatus = "pending";
    await order.save();

    res.json({
      message: "Cash payment selected",
      payment,
      order,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
