const mongoose = require('mongoose');

const resolutionLogSchema = new mongoose.Schema({
  localCafeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cafe',
    required: true,
    index: true // 加索引加快查詢
  },
  googlePlaceId: {
    type: String,
    required: true,
    index: true
  },
  isSame: {
    type: Boolean,
    required: true
  },
  aiReason: String // 選用：存下來方便除錯
}, { timestamps: true });

// 複合索引：確保我們查詢這一對組合時超快
resolutionLogSchema.index({ localCafeId: 1, googlePlaceId: 1 }, { unique: true });

module.exports = mongoose.model('ResolutionLog', resolutionLogSchema);