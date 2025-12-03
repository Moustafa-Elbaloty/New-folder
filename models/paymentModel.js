const mongoose = require("mongoose");

// نموذج الدفع — يسجّل كل عملية دفع تمت لأي طلب
const paymentSchema = new mongoose.Schema(
  {
    // المستخدم اللي دفع
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // الطلب اللي الدفع حصل ليه
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    // طريقة الدفع: كاش – سترايب – بايبال
    method: {
      type: String,
      enum: ["cash", "stripe", "paypal"],
      required: true,
    },

    // المبلغ المطلوب دفعه
    amount: {
      type: Number,
      required: true,
    },

    // حالة الدفع
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },

    // رقم العملية (من Stripe أو PayPal)
    transactionId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// ← الحل هنا
module.exports =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

  