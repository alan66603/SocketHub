require('dotenv').config();
const mongoose = require('mongoose');
const Cafe = require('./models/Cafe'); // load mongoose schema

// connect to database
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('🔥 MongoDB 連線成功！準備寫入資料...');
    seedData();
  })
  .catch(err => {
    console.log('❌ 連線失敗：');
    console.error(err);
  });

// Test data
const sampleCafe = {
  name: "小公寓Apt.cafe",
  location: {
    type: "Point",
    coordinates: [121.575443, 24.987906], // [Lng, Lat]
    address: "2樓, No. 56號指南路二段文山區臺北市116",
    city: "臺北市",
    district: "文山區"
  },
  tags: ["有插座", "有貓咪", "近公車站"],
  ratings: {
    quietness: 3.0,
    wifiStability: 4.5,
    seatComfort: 4.0,
    costPerformance: 4.0,
    seatAvailable: 3.0,
    foodQuality: 5.0,
    decorateStyle: 4.0
  },
  features: {
    limitedTime: true,
    timeLimitMinutes: 120,
    socketAvailability: "many",
    hasDessert: true,
    hasMainMeal: true,
    allowStanding: false
  },
  openingHours: {
    Mon: "11:00 - 21:00",
    Tue: "11:00 - 21:00",
    Wed: "11:00 - 21:00",
    Thu: "11:00 - 21:00",
    Fri: "11:00 - 21:00",
    Sat: "11:00 - 21:00",
    Sun: "11:00 - 21:00"
  }
};

// write data
const seedData = async () => {
  try {
    // clean up old data
    // await Cafe.deleteMany({}); 
    
    const newCafe = await Cafe.create(sampleCafe);
    console.log('✅ 成功寫入第一筆咖啡廳資料！');
    console.log(newCafe);
    
    // close connection
    mongoose.connection.close();
  } catch (error) {
    console.log('❌ 寫入失敗：', error.message);
  }
};