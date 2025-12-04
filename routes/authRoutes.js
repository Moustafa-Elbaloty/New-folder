const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", registerUser);

router.post("/login", loginUser);


router.get("/profile", protect, (req, res) => {
  res.json({
    message: `مرحبًا يا ${req.user.name} `,
    email: req.user.email,
    role: req.user.role,
  });
});

module.exports = router;
