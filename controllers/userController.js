const User = require("../models/userModel");
const Order = require("../models/orderModel");
const bcrypt = require("bcryptjs");

// 🟢 Get all users (Admins only)
const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });
    const users = await User.find().select("-password");
    if (users.length === 0) return res.status(404).json("Data Not found");
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
};

// 🔵 Get single user
const getUser = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Access denied" });
    if (!req.params.id) return res.status(404).send("Enter UserId");
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ message: "Server error while fetching user" });
  }
};

// 🟡 Update user (secure password update)
const updateUser = async (req, res) => {
  try {
    let id;

    // 🧠 تحديد الـ ID بناءً على الدور
    if (req.user.role === "admin") {
      id = req.params.id; // الأدمن يعدّل أي حد
    } else if(req.user.role === "user") {
      id = req.user.id; // اليوزر يعدّل نفسه فقط
    }

    // لو معملتش الكلام دا، يبقى في خطأ
    if (!id) {
      return res
        .status(400)
        .json({ message: "Could not determine user ID." });
    }

    const updates = req.body;

    // تحقق من وجود بيانات للتحديث
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No update data provided." });
    }

    // جلب المستخدم للتحقق من وجوده
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 🔒 منع تعديل email أو role للمستخدم العادي
    if (req.user.role !== "admin") {
      delete updates.email;
      delete updates.role;
    }

    // 🔐 تشفير الباسورد لو موجود
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    // ⚙️ التحديث الفعلي
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    ).select("-password");

    res.status(200).json({
      message: "User updated successfully.",
      user: updatedUser,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Server error while updating user.", error: err.message });
  }
};


// 🔴 Delete user
const deleteUser = async (req, res) => {
  try {
    let id;

    if (req.user.role === "admin") {
      id = req.params.id; 
      if (!id) {
        return res.status(400).json({ message: "User ID is required for admin." });
      }
    } else if(req.user.role === "user") {
      id = req.user.id;
    }

    // تنفيذ الحذف
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "User deleted successfully",
      deletedUser,
    });

  } catch (err) {
    console.error("Error deleting user:", err);
    return res.status(500).json({
      message: "Server error while deleting user"
    });
  }
};

const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id; // من الـ authentication middleware
    
    // جلب بيانات المستخدم بدون password
    const user = await User.findById(userId).select("-password");
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // التحقق من أن الحساب غير محظور
    if (user.isBlocked) {
      return res.status(403).json({ 
        success: false,
        message: "Account is blocked" 
      });
    }

    // جلب الطلبات الخاصة بالمستخدم
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "items.product",
        select: "name price images category"
      })
      .populate("vendor", "name email");

    // حساب الإحصائيات
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    
    const deliveredOrders = orders.filter(o => o.orderStatus === "delivered").length;
    const pendingOrders = orders.filter(o => o.orderStatus === "pending").length;
    const processingOrders = orders.filter(o => o.orderStatus === "processing").length;
    const shippedOrders = orders.filter(o => o.orderStatus === "shipped").length;
    const cancelledOrders = orders.filter(o => o.orderStatus === "cancelled").length;

    // إحصائيات الدفع
    const paidOrders = orders.filter(o => o.paymentStatus === "paid").length;
    const pendingPayments = orders.filter(o => o.paymentStatus === "pending").length;
    const failedPayments = orders.filter(o => o.paymentStatus === "failed").length;

    // الحصول على العنوان الافتراضي
    const defaultAddress = user.addresses.find(addr => addr.isDefault);

    // تنسيق الطلبات للعرض
    const formattedOrders = orders.map(order => ({
      id: order._id,
      orderNumber: `#ORD-${order._id.toString().slice(-6).toUpperCase()}`,
      items: order.items.map(item => ({
        productId: item.product?._id,
        productName: item.product?.name,
        productImage: item.product?.images?.[0],
        quantity: item.quantity,
        price: item.price,
        totalItemPrice: item.totalItemPrice
      })),
      totalPrice: order.totalPrice,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      vendor: order.vendor ? {
        id: order.vendor._id,
        name: order.vendor.name
      } : null,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    // Response
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          defaultAddress: defaultAddress || null,
          totalAddresses: user.addresses.length
        },
        stats: {
          orders: {
            total: totalOrders,
            delivered: deliveredOrders,
            pending: pendingOrders,
            processing: processingOrders,
            shipped: shippedOrders,
            cancelled: cancelledOrders
          },
          payments: {
            paid: paidOrders,
            pending: pendingPayments,
            failed: failedPayments
          },
          totalSpent
        },
        recentOrders: formattedOrders.slice(0, 5), // آخر 5 طلبات
        allOrders: formattedOrders
      }
    });

  } catch (err) {
    console.error("Error fetching dashboard:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching dashboard",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
};
module.exports = { getAllUsers, updateUser, deleteUser, getUser, getUserDashboard };


