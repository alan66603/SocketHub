import { APIProvider, Map } from '@vis.gl/react-google-maps';

function App() {
  // 台北市的座標 (Taipei 101 附近)
  const position = { lat: 25.0330, lng: 121.5654 };
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    // 1. APIProvider: 負責載入 Google Maps 的腳本
    <APIProvider apiKey={API_KEY}>
      
      {/* 2. 外層容器: 設定高度與寬度 (Tailwind) */}
      <div className="h-screen w-full">
        
        {/* 3. Map 元件: 真正的地圖 */}
        <Map
          defaultCenter={position}
          defaultZoom={14}
          mapId="DEMO_MAP_ID" // 這是 Google 規定的必填欄位，練習用隨便填即可
          className="h-full w-full"
        />
        
      </div>
    </APIProvider>
  );
}

export default App;