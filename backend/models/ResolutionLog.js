const mongoose = require("mongoose");

const resolutionLogSchema = new mongoose.Schema(
  {
    localCafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: true,
      index: true,
    },
    googlePlaceId: {
      type: String,
      required: true,
      index: true,
    },
    isSame: {
      type: Boolean,
      required: true,
    },
    aiReason: String, // optional: stored for debugging
  },
  { timestamps: true }
);

resolutionLogSchema.index(
  { localCafeId: 1, googlePlaceId: 1 },
  { unique: true }
);

module.exports = mongoose.model("ResolutionLog", resolutionLogSchema);
