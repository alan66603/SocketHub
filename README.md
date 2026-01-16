# SocketHub ☕
Find your next coding spot. SocketHub 是一個專為數位遊牧民族、學生與遠端工作者打造的咖啡廳地圖應用。結合 Google Maps 的廣大資料庫與社群貢獻的詳細資訊，幫你快速找到有插座、WiFi 穩定且適合工作的理想據點。

## 主要功能 (Features)
* 混合搜尋引擎 (Hybrid Search Engine)
  * 結合 Google Places API 的即時資料與 本地社群資料庫 (MongoDB)
  * 支援地圖拖曳搜尋與關鍵字搜尋
* AI 智慧資料整合 (AI-Powered Data Reconciliation)
  * 使用 Google Gemini AI 自動比對並合併重複的店家資料，解決 Google 資料與使用者建立資料衝突的問題
* 社群貢獻系統 (Crowdsourcing)
  * 使用者可即時回報 WiFi 穩定度、插座數量、限時狀況
  * 支援自定義 標籤 (Tags) 系統（如：#安靜、#適合讀書）
* 現代化使用者介面
  * 響應式側邊欄設計 (Sidebar Interface)
  * 直覺的互動式地圖體驗

## Tech Stack
### Frontend (前端)
* **Core**: [React](https://react.dev/) (Vite)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v3.4)
* **Maps**: Google Maps JavaScript API (@vis.gl/react-google-maps)
* **UI Components**: React Hot Toast (Notifications)

### Backend (後端)
* **Runtime**: [Node.js](https://nodejs.org/)
* **Framework**: [Express.js](https://expressjs.com/)
* **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose)
* **AI Intergration**: [Google Generative AI SDK](https://ai.google.dev/) (`Gemini-2.5-flash-lite`)

## Getting Started
請依照以下步驟在你的本機環境啟動專案。

### 1. 環境需求 (Prerequisites)
* Node.js (v18+)
* MongoDB Atlas 帳號 (或本機 MongoDB)
* Google Cloud Platform 帳號 (需啟用 Maps JavaScript API, Places API & Gemini API)

### 2. 安裝依賴 (Installation)
```
# 1. Clone 專案
git clone https://github.com/你的帳號/SocketHub.git
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

