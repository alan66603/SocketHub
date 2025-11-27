require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
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

app.post('/api/cafes/search', async (req, res) => {
    // the frontend will return centre point (lat, lng) and radius
    const {lat, lng, radius = 1000} = req.body;
    const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    try {
        // A. 去 Google Maps 抓附近的咖啡廳 (https://developers.google.com/maps/documentation/places/web-service/nearby-search?hl=zh-tw)
        // 使用 Google New Places API (searchNearby)
        const googleResponse = await axios.post(
            'https://places.googleapis.com/v1/places:searchNearby',
            {
                locationRestriction: {
                    circle: {
                        center: { latitude: lat, longitude: lng },
                        radius: radius // 單位：公尺
                    }
                },
                includedTypes: ['cafe', 'coffee_shop'] // 只抓咖啡廳
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': GOOGLE_API_KEY,
                    // 指定需要的欄位 (FieldMask) 以節省成本
                    'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress,places.rating,places.userRatingCount'
                }
            }
        );

        const googlePlaces = googleResponse.data.places || [];

        // B. 準備 MongoDB 查詢
        // 收集所有 Google 回傳的 ID
        // ex:
        // googlePlaces = [
        // { id: "A001", name: "Starbucks" },
        // { id: "A002", name: "7-11" },
        // { id: "A003", name: "FamilyMart" }
        // ]
        const googlePlaceIds = googlePlaces.map(p => p.id);

        // 去我們的資料庫找：這些 Google 的店，我們有沒有存過？
        const localCafes = await Cafe.find({
            googlePlaceId: { $in: googlePlaceIds }
        });

        // C. 合併資料 (Merge Strategy)
        const mergedResults = googlePlaces.map(gPlace => {
            // 檢查這家店是否在我們的 DB 裡
            const localMatch = localCafes.find(local => local.googlePlaceId === gPlace.id);

            if (localMatch) {
                // [情況 1] 資料庫有：優先使用我們的資料 (裡面有使用者的詳細 Tag 和評分)
                return {
                    ...localMatch.toObject(),
                    source: 'hybrid' // 標記：這是混合資料
                };
            } else {
                // [情況 2] 資料庫沒有：把 Google 資料轉成我們的前端格式
                return {
                    _id: gPlace.id, // 暫時用 Google ID 當 ID
                    googlePlaceId: gPlace.id,
                    name: gPlace.displayName?.text || "未命名咖啡廳",
                    location: {
                        type: "Point",
                        coordinates: [gPlace.location.longitude, gPlace.location.latitude], // 注意順序: [lng, lat]
                        address: gPlace.formattedAddress
                    },
                    ratings: {
                        wifiStability: 0, 
                        googleRating: gPlace.rating, // 這是 Google 的評分
                        googleRatingCount: gPlace.userRatingCount
                    },
                    tags: [], 
                    features: { hasManySockets: 'unknown', timeLimit: 'unknown' },
                    source: 'google' // 標記：這純粹是 Google 的資料
                };
            }
        });

        res.json(mergedResults);

    } catch(error) {
        console.error("Search Error:", error.response?.data || error.message);
        res.status(500).json({message: "搜尋失敗", error: error.message});
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