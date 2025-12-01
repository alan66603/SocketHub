require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const Cafe = require("./models/Cafe");
const ResolutionLog = require("./models/ResolutionLog");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { version } = require("os");

const app = express();
const PORT = process.env.PORT || 8080;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

// 在啟動 server 前加入這段測試
async function listModels() {
  try {
    // 取得所有可用模型
    // 注意：這裡因為 SDK 版本不同，寫法可能略有差異，通常不需要這段就能解決問題
    // 如果上面的修正無效，再來跑這段
    console.log("正在查詢可用模型...");
    // 這裡只是示意，通常不需要用到
  } catch (error) {
    console.log("查詢模型失敗", error);
  }
}

// Gemini version
async function checkSamePlaceWithAI(localName, googleName, distance) {
  try {
    const prompt = `
      You are a data reconciliation expert.
      Compare these two place names and determine if they refer to the same physical establishment.
      
      Rules:
      1. Allow for translations (e.g., "Apt. Cafe" == "小公寓").
      2. Allow for abbreviations or missing branch names.
      3. Strict differentiation for major brands (e.g., "Starbucks" != "Louisa").
      
      Input:
      - Local Name: "${localName}"
      - Google Name: "${googleName}"
      - Distance: ${distance.toFixed(1)} meters
      
      Output ONLY a JSON object with no markdown formatting:
      { "isSame": boolean, "reason": "short string" }
    `;

    // 發送請求給 Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // 清理 Gemini 可能回傳的 Markdown 標記 (例如 ```json ... ```)
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonResult = JSON.parse(text);

    console.log(
      `✨ Gemini 判決 [${localName}] vs [${googleName}]: ${jsonResult.isSame} (${jsonResult.reason})`
    );
    return jsonResult.isSame;
  } catch (error) {
    console.error("Gemini Check Error:", error);
    return false; // 失敗時保守回傳 false
  }
}

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
app.get("/api/cafes", async (req, res) => {
  try {
    const cafes = await Cafe.find(); // fetch all data from the database
    res.json(cafes); // return JSON to frontend
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/cafes/search", async (req, res) => {
  // the frontend will return centre point (lat, lng) and radius
  const { lat, lng, radius = 1000 } = req.body;
  const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

  try {
    // A. 去 Google Maps 抓附近的咖啡廳 (https://developers.google.com/maps/documentation/places/web-service/nearby-search?hl=zh-tw)
    // 使用 Google New Places API (searchNearby)
    const googleResponse = await axios.post(
      "https://places.googleapis.com/v1/places:searchNearby",
      {
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius, // 單位：公尺
          },
        },
        includedTypes: ["cafe", "coffee_shop"], // 只抓咖啡廳
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_API_KEY,
          // 指定需要的欄位 (FieldMask) 以節省成本
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.location,places.formattedAddress,places.rating,places.userRatingCount",
        },
      }
    );

    const googlePlaces = googleResponse.data.places || [];

    // B. 抓取本地資料庫 (這裡稍微改一下：抓取全部，或者抓取範圍內的)
    // 為了簡單起見，我們先抓取所有本地咖啡廳來做比對
    // (進階作法是用 MongoDB $near 查詢，但目前資料量少，全部抓出來比對也很快)
    const allLocalCafes = await Cafe.find();

    // ✨ 準備一個 Set 來記錄「已經被配對過」的本地咖啡廳 ID
    // 這樣可以防止兩家 Google 的店搶同一家本地的店
    const usedLocalIds = new Set();
    const mergedResults = [];
    const updatePromises = [];

    for (const gPlace of googlePlaces) {
      // Only ask AI with those cafe really close to each other

      let localMatch = null;

      // 我們不能用 array.find，因為裡面有 await (AI 請求)
      // 所以改用傳統 for 迴圈來尋找匹配
      for (const local of allLocalCafes) {
        if (usedLocalIds.has(local._id.toString())) continue;

        // 1. ID 匹配 (最快，最優先)
        if (local.googlePlaceId === gPlace.id) {
          localMatch = local;
          break;
        }

        // 2. 距離篩選
        const dist = getDistanceInMeters(
          local.location.coordinates[1],
          local.location.coordinates[0],
          gPlace.location.latitude,
          gPlace.location.longitude
        );

        // 3. AI ultimate judge (only with distance < 30)
        if (dist < 30) {     
            // check if it is examined before
            const existingLog = await ResolutionLog.findOne({
                localCafeId: local._id,
                googlePlaceId: gPlace.id
            });

            let isSame = false;

            if (existingLog) {
                // A. 以前判決過：直接用紀錄，不用花錢問 AI
                // console.log(`💾 命中快取: ${local.name} vs ${gPlace.displayName.text} => ${existingLog.isSame}`);
                isSame = existingLog.isSame;
            } else {
                // B. 沒判決過：只好花錢問 AI
                console.log(`🤖 AI 審判啟動: ${local.name} vs ${gPlace.displayName.text}`);
                const aiResult = await checkSamePlaceWithAI(local.name, gPlace.displayName?.text, dist);
                
                // 存下判決結果 (不管是 true 還是 false 都要存！)
                await ResolutionLog.findOneAndUpdate({
                    localCafeId: local._id,
                    googlePlaceId: gPlace.id,
                },
                {
                    isSame: aiResult,
                    aiReason: "Gemini check"
                },
                {upsert: true, new: true, setDefaultsOnInsert: true}
            );
                
                isSame = aiResult;
            }

          if (isSame) {
            localMatch = local;
            break; // 找到了就跳出內層迴圈
          }
        }
      }

      if (localMatch) {
        // [情況 1] 找到本地資料 (無論是透過 ID 還是距離)
        usedLocalIds.add(localMatch._id.toString());
        let needSave = false;

        // ✨ 自動修復機制 (Self-Healing)：
        // 如果是透過「距離」找到的，但它還沒有 googlePlaceId，我們幫它補上去！
        // 這樣下次搜尋就會直接透過 ID 匹配，不用再算距離了。
        if (!localMatch.googlePlaceId) {
          // console.log(`🔗 [連結] 綁定 ID: ${localMatch.name}`);
          localMatch.googlePlaceId = gPlace.id;
          needSave = true;
        }

        // ✨ 2. 同步店名 (Sync Name)
        const googleName = gPlace.displayName?.text;
        if (googleName && localMatch.name !== googleName) {
          // console.log(`📝 [校正] 更新店名: "${localMatch.name}" -> "${googleName}"`);
          localMatch.name = googleName; // 更新 mongoose 物件
          needSave = true;
        }

        // ✨ 3. 同步地址 (Sync Address)
        const googleAddress = gPlace.formattedAddress;
        if (googleAddress && localMatch.location.address !== googleAddress) {
          // console.log(`📍 [校正] 更新地址`);
          localMatch.location.address = googleAddress;
          needSave = true;
        }

        // 如果有任何變更，寫回 MongoDB
        if (needSave) {
          updatePromises.push(localMatch.save());
        }

        mergedResults.push({
          ...localMatch.toObject(),
          source: "hybrid",
          ratings: {
            ...localMatch.ratings,
            googleRating: gPlace.rating,
          },
        });
      } else {
        // [情況 2] 完全沒看過的新店
        mergedResults.push({
          _id: gPlace.id,
          googlePlaceId: gPlace.id,
          name: gPlace.displayName?.text || "未命名咖啡廳",
          location: {
            type: "Point",
            coordinates: [gPlace.location.longitude, gPlace.location.latitude],
            address: gPlace.formattedAddress,
          },
          ratings: {
            wifiStability: 0,
            googleRating: gPlace.rating,
            googleRatingCount: gPlace.userRatingCount,
          },
          tags: [],
          features: { hasManySockets: "unknown", timeLimit: "unknown" },
          source: "google",
        });
      }
    }

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`✨ 批量更新了 ${updatePromises.length} 筆資料`);
    }

    res.json(mergedResults);
  } catch (error) {
    console.error("Search Error:", error.response?.data || error.message);
    res.status(500).json({ message: "搜尋失敗", error: error.message });
  }
});

// [POST] add one new cafe
app.post("/api/cafes", async (req, res) => {
  try {
    const newCafe = await Cafe.create(req.body);
    res.status(201).json(newCafe); // return the new object
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.post('/api/cafes/contribute', async (req, res) => {
    const { 
        googlePlaceId, name, address, lat, lng, // 基本資料 (Google 店需要)
        newTags = [], 
        wifiRating, 
        socketStatus, 
        timeStatus,
        comment
    } = req.body;

    try {
        let cafe;

        // 1. 先找找看資料庫有沒有這家店
        if (googlePlaceId) {
            cafe = await Cafe.findOne({ googlePlaceId });
        }

        // 2. 如果沒有 (這是 Google 的店，第一次有人編輯)，建立新檔
        if (!cafe) {
            console.log("✨ 建立新本地檔案 (from Google):", name);
            cafe = new Cafe({
                googlePlaceId,
                name,
                location: {
                    type: "Point",
                    coordinates: [lng, lat],
                    address
                },
                // 初始化預設值
                ratings: { wifiStability: 0, wifiVoteCount: 0 },
                features: { hasManySockets: 'unknown', timeLimit: 'unknown' }
            });
        }

        // 3. 更新 Tags (Set 去重)
        if (newTags.length > 0) {
            newTags.forEach(tag => {
                if (!cafe.tags.includes(tag)) {
                    cafe.tags.push(tag);
                }
            });
        }

        // 4. 更新 WiFi 評分 (加權平均法)
        if (wifiRating && Number(wifiRating) > 0) {
            const currentScore = cafe.ratings.wifiStability || 0;
            const currentCount = cafe.ratings.wifiVoteCount || 0;
            
            // 公式：(舊分 * 舊人數 + 新分) / (舊人數 + 1)
            const newScore = ((currentScore * currentCount) + Number(wifiRating)) / (currentCount + 1);
            
            cafe.ratings.wifiStability = parseFloat(newScore.toFixed(1));
            cafe.ratings.wifiVoteCount = currentCount + 1;
        }

        // 5. 更新 插座 & 限時 (採用「最新回報優先」策略)
        if (socketStatus && socketStatus !== "unknown") {
            cafe.features.hasManySockets = socketStatus;
        }
        if (timeStatus && timeStatus !== "unknown") {
            cafe.features.timeLimit = timeStatus;
        }

        // 6. 新增評論
        if (comment && comment.trim().length > 0) {
            cafe.comments.push({ text: comment });
        }

        await cafe.save();
        res.json({ message: "更新成功", cafe });

    } catch (error) {
        console.error("Contribute Error:", error);
        res.status(500).json({ message: "更新失敗", error: error.message });
    }
});

// --- 4. activate the server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`👉 Test URL: http://localhost:${PORT}/api/cafes`);
});
