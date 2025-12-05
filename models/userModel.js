const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[\w-\.]+@([\w-]+\.)+[\w-]{2,}$/,
        "Please enter a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "vendor", "admin"],
      default: "user",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,


    // Security
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lockUntil: Date,
    lastLogin: Date,

    addresses: [
      {
        street: String,
        city: String,
        state: String,
        country: String,
        postalCode: String,
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);


userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.createEmailVerificationToken = function () {
    const verificationToken = crypto.randomBytes(32).toString("hex");

    this.emailVerificationToken = crypto
      .createHash("sha256")
      .update(verificationToken)
      .digest("hex");

    this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 ساعة

    return verificationToken;
};

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 دقايق

    return resetToken;
};



module.exports = mongoose.model("User", userSchema);
