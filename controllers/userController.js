const User = require("../models/userModel");
const bcrypt = require('bcryptjs');


// 🟢 Get all users (Admins only)
 const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password"); 
    if (users.length === 0) 
        return res.status(404).json("Data Not found");
    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
};

// 🔵 Get single user
 const getUser = async (req, res) => {
  try {
    if(!req.params.id)
        return res.status(404).send("Enter UserId")
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
    const id = req.params.id;

    // تحقق من وجود الـ ID
    if (!id) {
      return res.status(400).json({ message: "Please provide a valid user ID." });
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

    // 🧠 منع تعديل email أو role إلا لو الأدمن
    if (!req.user || req.user.role !== "admin") {
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
    res.status(500).json({ message: "Server error while updating user.", error: err });
  }
};

// 🔴 Delete user
const deleteUser = async (req, res) => {
  try {
    if(!req.params.id)
        return res.status(400).send("user id is required");
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser)
      return res.status(404).json({ message: "User not found" });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Server error while deleting user" });
  }
};

const makeVendorByAdmin = async (req, res) => {
  try {
    const { id } = req.params; // user ID اللي الأدمن عايز يرفعه Vendor

    // هات اليوزر
    const user = await userModel.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // اتأكد إن اليوزر مش Vendor أصلاً
    const existingVendor = await vendorModel.findOne({ user: id });
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "This user is already a vendor",
      });
    }

    // إنشاء Vendor جديد لهذا اليوزر
    const vendor = await vendorModel.create({
      user: id,
      storeName: user.name + "'s Store", // اسم مؤقت وقابل للتعديل
    });

    // تغيير دور اليوزر
    await userModel.findByIdAndUpdate(id, { role: "vendor" });

    res.status(201).json({
      success: true,
      message: "User upgraded to vendor successfully",
      data: vendor,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error converting user to vendor",
      error: error.message,
    });
  }
};



module.exports = {getAllUsers, updateUser, deleteUser, getUser, makeVendorByAdmin};

