import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";
// import CafeForm from "./components/CafeForm";

const socketMap = {
  many: "多",
  few: "少",
  none: "無",
};

const timeLimitMap = {
  limited: "⏳ 限時",
  unlimited: "✅ 不限時",
};

function App() {
  const defaultPosition = { lat: 25.033, lng: 121.5654 }; // Taipei 101
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // 1. define State: used to store the data of cafe from the backend
  const [cafes, setCafes] = useState([]);

  const [activeState, setActiveState] = useState({
    cafe: null,
    mode: null,  // 'hover' or 'click'
  });

  const hoverTimeoutRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/cafes"
  // 2. useEffect: Once the page was loaded, it goes to fetch the data from the backend
  useEffect(() => {
    axios
      .get(API_URL)
      .then((response) => {
        console.log("Data Fetched.", response.data);
        setCafes(response.data); // store the data into State, React will renew the page
      })
      .catch((error) => {
        console.error("Fetch error: ", error);
      });
  }, []);

  // mouse enter
  const handleMouseEnter = (cafe) => {
    // 🛑 防呆 1：如果現在已經是「鎖定模式 (Click)」，且滑鼠指的正是同一家店，什麼都別做 (別干擾鎖定)
    if (activeState.mode === "click" && activeState.cafe?._id === cafe._id) {
      return;
    }

    // 🛑 防呆 2：如果現在已經是「預覽模式 (Hover)」，且顯示的也是這家店，不要重置計時器 (解決滑鼠微動重置問題)
    if (activeState.mode === "hover" && activeState.cafe?._id === cafe._id) {
      return;
    }

    // 清除舊的計時器
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    // 設定新的計時器 (0.5秒後開啟預覽)
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveState({ cafe: cafe, mode: "hover" });
    }, 500);
  };

  // mouse leave
  const handleMouseLeave = () => {
    // if leave before 500 ms countdown, cancel the countdown
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // 🛑 關鍵邏輯：只有在「預覽模式 (Hover)」下，移開滑鼠才要關閉視窗
    // 如果是「鎖定模式 (Click)」，移開滑鼠「不做任何事」，保持視窗開啟
    if (activeState.mode === "hover") {
      setActiveState({ cafe: null, mode: null });
    }
  };

  const handleClose = () => {
    setActiveState({cafe: null, mode: null});
  };

  const handleClick = (cafe) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    if(activeState.mode === "click" && activeState.cafe?._id === cafe._id){
      handleClose();
    }else{
      setActiveState({cafe: cafe, mode: "click"});
    }
  };

  return (
    // 1. APIProvider: 負責載入 Google Maps 的腳本
    <APIProvider apiKey={API_KEY}>
      {/* 2. 外層容器: 設定高度與寬度 (Tailwind) */}
      <div className="h-screen w-full">
        {/* 3. Map 元件: 真正的地圖 */}
        <Map
          defaultCenter={defaultPosition}
          defaultZoom={13}
          mapId="DEMO_MAP_ID" // 這是 Google 規定的必填欄位，練習用隨便填即可
          className="h-full w-full"
        >
          {cafes.map((cafe) => (
            <AdvancedMarker
              key={cafe._id}
              position={{
                // ⚠️ 注意：MongoDB 是 [經度, 緯度]，Google Maps 要 { lat, lng }
                // 所以這裡要反過來拿：coordinates[1] 是 lat, coordinates[0] 是 lng
                lat: cafe.location.coordinates[1],
                lng: cafe.location.coordinates[0],
              }}
              title={cafe.name} // hover to show the cafe name
              onClick={() => handleClick(cafe)} // store this cafe on click
              onMouseEnter={() => handleMouseEnter(cafe)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Form of pin and color */}
              <Pin
                background={"#FBBC04"}
                glyphColor={"#000"}
                borderColor={"#000"}
              />
            </AdvancedMarker>
          ))}

          {activeState.cafe && (
            <InfoWindow
              position={{
                lat: activeState.cafe.location.coordinates[1],
                lng: activeState.cafe.location.coordinates[0],
              }}
              onCloseClick={handleClose}
              minWidth={200}
              pixelOffset={[0, -30]}
            >
              <div className="p-2">
                <h2 className="text-lg font-bold mb-2">{activeState.cafe.name}</h2>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>📍 {activeState.cafe.location.address}</p>
                  <p>📶 WiFi 穩定度: {activeState.cafe.ratings.wifiStability} ⭐</p>
                  <p>
                    🔌 插座數量:{" "}
                    {socketMap[activeState.cafe.features.hasManySockets]}
                  </p>
                  <p className="mt-2 text-blue-600 font-semibold">
                    {timeLimitMap[activeState.cafe.features.timeLimit]}
                  </p>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </div>
    </APIProvider>
  );
}

export default App;
