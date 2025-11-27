const mongoose = require("mongoose");

const cafeSchema = new mongoose.Schema(
  {
    googlePlaceId: {
      type: String,
      unique: true,
      sparse: true
    },

    name: {
      type: String,
      required: [true, "Cafe name is required."],
      trim: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
      address: String,
      city: String,
      district: String,
    },

    tags: [String],

    ratings: {
      quietness: { type: Number, min: 0, max: 5, default: 0 },
      wifiStability: { type: Number, min: 0, max: 5, default: 0 },
      seatComfort: { type: Number, min: 0, max: 5, default: 0 },
      costPerformance: { type: Number, min: 0, max: 5, default: 0 },
      seatAvailable: { type: Number, min: 0, max: 5, default: 0 },
      foodQuality: { type: Number, min: 0, max: 5, default: 0 },
      decorateStyle: { type: Number, min: 0, max: 5, default: 0 },
    },

    features: {
      timeLimit: {
        type: String,
        enum: ["limited", "unlimited"],
        default: "limited",
      },
      singleDish: { type: Boolean, default: false },
      hasDessert: { type: Boolean, default: false },
      hasManySockets: {
        type: String,
        enum: ["many", "few", "none"],
        default: "none",
      },
      hasMainMeal: { type: Boolean, default: false },
      isStandingFriendly: { type: Boolean, default: false },
    },

    openingTime: {
      Mon: String,
      Tue: String,
      Wed: String,
      Thu: String,
      Fri: String,
      Sat: String,
      Sun: String,
    },
  },
  {
    timestamps: true,
  }
);

cafeSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Cafe", cafeSchema);
