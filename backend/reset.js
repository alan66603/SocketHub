// delete all data in database.

require('dotenv').config();
const mongoose = require('mongoose');
const Cafe = require('./models/Cafe');
const ResolutionLog = require('./models/ResolutionLog');

const resetDB = async() => {
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🔥 連線成功，準備清除資料...');

        await Cafe.deleteMany({});
        console.log('✅ 已刪除所有咖啡廳資料 (Cafes)');

        await ResolutionLog.deleteMany({});
        console.log('✅ 已刪除所有 AI 判決紀錄 (ResolutionLogs)');

        console.log('資料庫已重置為空');
        process.exit();
    }catch(error){
        console.error('❌ 清除失敗:', error);
        process.exit(1);
    }
};

resetDB();