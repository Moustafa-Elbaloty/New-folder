const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
dotenv.config();
const PORT = process.env.PORT || 5000;
const app = express();
app.use(express.json());

// Make uploads folder public
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors({
  origin: "http://localhost:4200",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

connectDB();

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:4200", methods: ["GET", "POST"] },
});

// إضافة io في request object لكل الـ Controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// استقبال الاتصالات
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

const vendorRoutes = require("./routes/vendorRoutes");
app.use("/api/vendor", vendorRoutes);

const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);



const chatbotRoutes = require("./routes/chatbotRoutes");
app.use("/api/chat", chatbotRoutes);
// 🛒 مسارات الكارت
const cartRoutes = require("./routes/cartRoutes");
app.use("/api/cart", cartRoutes);

// 📦 مسارات الطلبات
const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

// مسارات الادمن
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

// 💳 مسارات الدفع
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/api/payment", paymentRoutes);

server.listen(PORT, () => {
  console.log(`Server + Socket.io running on port ${PORT}`);
});
