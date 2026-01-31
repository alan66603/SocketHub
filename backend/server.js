require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cafeRoutes = require("./routes/CafeRoutes");

const app = express();
const PORT = process.env.PORT || 8080;

// --- 1. Middleware (中間件) 設定 ---
app.use(cors()); // 允許跨域請求 (讓 React 可以連線)
app.use(express.json()); // 解析 JSON 格式的 Request Body

// --- 2. Connect to database ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connect successfully (Server)"))
  .catch((err) => console.error("Failed to connect:", err));

app.use("/api/cafes", cafeRoutes);

// --- 4. activate the server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/api/cafes`);
});