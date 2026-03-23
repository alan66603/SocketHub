# SocketHub ☕
**Find your next coding spot.**

SocketHub is a comprehensive cafe map application designed specifically for digital nomads, students, and remote workers. By combining the vast database of Google Maps with community-contributed details, it helps you quickly locate the ideal workspace with reliable WiFi, ample power outlets, and the right atmosphere.

![Project Status](https://img.shields.io/badge/Status-Development-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Key Features
* **Hybrid Search Engine**
  * Seamlessly integrates real-time data from the **Google Places API** with our **Local Community Database (MongoDB)**.
  * Supports both interactive map-drag search and keyword queries.
* **AI-Powered Data Reconciliation**
  * Real-time reporting for **WiFi speed**, **Socket availability**, and **Time limits**.
  * Custom **Tagging System** (e.g., #Quiet, #GoodForMeetings).
* **Community Crowdsourcing**
  * Real-time reporting for **WiFi speed**, **Socket availability**, and **Time limits**.
  * Custom **Tagging System** (e.g., #Quiet, #GoodForMeetings).
* **Modern User Interface**
  * Responsive Sidebar Interface.
  * Smooth, interactive map experience with dynamic loading.

## Tech Stack

### Frontend
* **Core**: [React](https://react.dev/) (Vite)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v3.4)
* **Maps**: Google Maps JavaScript API (@vis.gl/react-google-maps)
* **UI Components**: React Hot Toast (Notifications)

### Backend
* **Runtime**: [Node.js](https://nodejs.org/)
* **Framework**: [Express.js](https://expressjs.com/)
* **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose)
* **AI Intergration**: [Google Generative AI SDK](https://ai.google.dev/) (`Gemini-2.5-flash-lite`)

## Getting Started

Follow these steps to set up the project locally.

### 1. Prerequisites
* Node.js (v18+)
* MongoDB Atlas account (or local MongoDB instance)
* Google Cloud Platform account (Maps JavaScript API, Places API & Gemini API enabled)

### 2. Installation
```
# 1. Clone repository
git clone https://github.com/your-username/SocketHub.git
cd SocketHub
```
```
# 2. backend
cd backend
npm install
```
```
# 3. frontend
cd frontend
npm install
```

### 3. Environment Variables
Create a `.env` file in both the `backend` and `frontend` directories.

**Backend (backend/.env):**
```
PORT=8080
MONGO_URI=
GOOGLE_MAPS_API_KEY=
GEMINI_API_KEY=
```

**Frontend(frontend/.env):**
```
VITE_GOOGLE_MAPS_API_KEY=
VITE_API_URL=http://localhost:8080/api/cafes
```

### 4. Running the App
It is recommended to run the frontend and backend in seperate terminal windows.
```
cd backend
node server.js

cd frontend
npm run dev
```

### Project Structure

```
SocketHub/
├── backend/             # Node.js + Express Backend
│   ├── controllers/     # Request logic
│   ├── models/          # MongoDB Schemas
│   ├── routes/          # API Routes
│   ├── services/        # Business Logic (AI, Search)
│   └── server.js        # Entry point
│
├── frontend/            # React + Vite Frontend
│   ├── src/
│   │   ├── components/  # UI Components
│   │   └── App.jsx      # Main Application
│   └── tailwind.config.js
│
└── README.md
```

## Infrastructure
AWS EC2: Dynamic, for Node.js and API computing
AWS S3 + CloudFront: Static, for React static web page

[SocketHub](https://d20u7fby0bngts.cloudfront.net/)