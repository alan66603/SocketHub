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


function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371; // 地球半徑 (km)
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d * 1000; // Return in meters
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

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

        // B. 抓取本地資料庫 (這裡稍微改一下：抓取全部，或者抓取範圍內的)
        // 為了簡單起見，我們先抓取所有本地咖啡廳來做比對
        // (進階作法是用 MongoDB $near 查詢，但目前資料量少，全部抓出來比對也很快)
        const allLocalCafes = await Cafe.find();

        // C. 智慧合併 (Smart Merge)
        const mergedResults = await Promise.all(googlePlaces.map(async (gPlace) => {
            
            // 🔍 尋找匹配：
            // 條件 1: ID 相同 (最強烈的匹配)
            // 條件 2: 距離極近 (< 30公尺) 視為同一家 (解決名稱不同、ID 缺失的問題)
            let localMatch = allLocalCafes.find(local => {
                // 檢查 ID
                if (local.googlePlaceId === gPlace.id) return true;
                
                // 檢查距離
                const dist = getDistanceInMeters(
                    local.location.coordinates[1], // lat
                    local.location.coordinates[0], // lng
                    gPlace.location.latitude,
                    gPlace.location.longitude
                );
                
                // 如果距離小於 30 公尺，我們就假設它是同一家
                return dist < 30;
            });

            if (localMatch) {
                // [情況 1] 找到本地資料 (無論是透過 ID 還是距離)
                
                // ✨ 自動修復機制 (Self-Healing)：
                // 如果是透過「距離」找到的，但它還沒有 googlePlaceId，我們幫它補上去！
                // 這樣下次搜尋就會直接透過 ID 匹配，不用再算距離了。
                if (!localMatch.googlePlaceId) {
                    console.log(`🔗 自動連結: ${localMatch.name} <--> ${gPlace.displayName.text}`);
                    localMatch.googlePlaceId = gPlace.id;
                    await localMatch.save(); // 寫回資料庫
                }

                // 回傳混合資料 (以本地資料為主)
                return {
                    ...localMatch.toObject(),
                    source: 'hybrid',
                    // 這裡可以選擇是否要更新本地的 googleRating
                    ratings: {
                        ...localMatch.ratings,
                        googleRating: gPlace.rating // 更新最新的 Google 評分
                    }
                };
            } else {
                // [情況 2] 完全沒看過的新店
                return {
                    _id: gPlace.id, // 暫時 ID
                    googlePlaceId: gPlace.id,
                    name: gPlace.displayName?.text || "未命名咖啡廳",
                    location: {
                        type: "Point",
                        coordinates: [gPlace.location.longitude, gPlace.location.latitude],
                        address: gPlace.formattedAddress
                    },
                    ratings: {
                        wifiStability: 0,
                        googleRating: gPlace.rating,
                        googleRatingCount: gPlace.userRatingCount
                    },
                    tags: [],
                    features: { hasManySockets: 'unknown', timeLimit: 'unknown' },
                    source: 'google'
                };
            }
        }));

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