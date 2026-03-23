require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cafeRoutes = require("./routes/CafeRoutes");

// --- 0. Startup env validation ---
const REQUIRED_ENV = ["MONGO_URI", "GOOGLE_MAPS_API_KEY", "GEMINI_API_KEY"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(`[Startup failed] Missing required env vars: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 8080;

// --- 1. Middleware Setting---
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

// --- 2. Connect to database ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connect successfully (Server)"))
  .catch((err) => console.error("Failed to connect:", err));

app.get('/', (_req, res) => {
  res.json({
    message: "SocketHub Backend is running!",
    endpoints: ["/api/cafes"]
  });
});

app.use("/api/cafes", cafeRoutes);

// --- 3. Start server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test URL: http://localhost:${PORT}/api/cafes`);
});