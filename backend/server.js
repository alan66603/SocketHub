require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Cafe = require("./models/Cafe");

const app = express();
const PORT = process.env.PORT || 8080;

// --- 1. Middleware (中間件) 設定 ---
app.use(cors()); // 允許跨域請求 (讓 React 可以連線)
app.use(express.json()); // 解析 JSON 格式的 Request Body

// --- 2. Connect to database ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🔥 MongoDB 連線成功 (Server)"))
  .catch((err) => console.error("❌ 連線失敗:", err));


// --- 3. API Routes ---

// [GET] get every cafe
app.get('/api/cafes', async (req, res) => {
    try {
        const cafes = await Cafe.find(); // fetch all data from the database
        res.json(cafes); // return JSON to frontend
    }catch(error){
        res.status(500).json({message: error.message});
    }
});

// [POST] add one new cafe
app.post('/api/cafes', async (req, res) => {
    try{
        const newCafe = await Cafe.create(req.body);
        res.status(201).json(newCafe); // return the new object
    }catch(error){
        res.status(400).json({message: error.message});
    }
});

// --- 4. activate the server ---
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`👉 Test URL: http://localhost:${PORT}/api/cafes`);
});