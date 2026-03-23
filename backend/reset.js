// delete all data in database.

require("dotenv").config();
const mongoose = require("mongoose");
const Cafe = require("./models/Cafe");
const ResolutionLog = require("./models/ResolutionLog");

const resetDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected. Clearing database...");

    await Cafe.deleteMany({});
    console.log("Deleted all cafe records (Cafes)");

    await ResolutionLog.deleteMany({});
    console.log("Deleted all AI resolution logs (ResolutionLogs)");

    console.log("Database reset complete");
    process.exit();
  } catch (error) {
    console.error("Reset failed:", error);
    process.exit(1);
  }
};

resetDB();
