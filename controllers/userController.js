const User = require("../models/userModel");
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


module.exports = { getAllUsers, updateUser, deleteUser, getUser };
