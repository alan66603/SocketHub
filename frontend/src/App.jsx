import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import CafeForm from "./components/CafeForm";

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
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/cafes"

  // 1. define State: used to store the data of cafe from the backend
  const [cafes, setCafes] = useState([]);
  const [activeState, setActiveState] = useState({
    cafe: null,
    mode: null,  // 'hover' or 'click'
  });

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newCafeLocation, setNewCafeLocation] = useState(null);

  // loading state, preventing from user thinks the app is lagged
  const [isLocating, setIsLocating] = useState(false);

  const hoverTimeoutRef = useRef(null);

  // 2. useEffect: Once the page was loaded, it goes to fetch the data from the backend
  const fetchCafes = () => {
    axios.get(API_URL)
    .then((res) => setCafes(res.data))
    .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchCafes();
  }, []);

  // mouse enter
  const handleMouseEnter = (cafe) => {
    // 🛑 防呆 1：如果現在已經是「鎖定模式 (Click)」，且滑鼠指的正是同一家店，什麼都別做 (別干擾鎖定)
    if (activeState.mode === "click" && activeState.cafe?._id === cafe._id) return;
    // 🛑 防呆 2：如果現在已經是「預覽模式 (Hover)」，且顯示的也是這家店，不要重置計時器 (解決滑鼠微動重置問題)
    if (activeState.mode === "hover" && activeState.cafe?._id === cafe._id) return;
    // 清除舊的計時器
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    // 設定新的計時器 (0.5秒後開啟預覽)
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveState({ cafe: cafe, mode: "hover" });
    }, 500);
  };

  // mouse leave
  const handleMouseLeave = () => {
    // if leave before 500 ms countdown, cancel the countdown
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    // 🛑 關鍵邏輯：只有在「預覽模式 (Hover)」下，移開滑鼠才要關閉視窗
    // 如果是「鎖定模式 (Click)」，移開滑鼠「不做任何事」，保持視窗開啟
    if (activeState.mode === "hover") setActiveState({ cafe: null, mode: null });
  };

  const handleClose = () => {
    setActiveState({cafe: null, mode: null});
  };

  const handleClick = (cafe) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if(isAddingMode) return;
    if(activeState.mode === "click" && activeState.cafe?._id === cafe._id){
      handleClose();
    }else{
      setActiveState({cafe: cafe, mode: "click"});
    }
  };

  const handleMapClick = (e) => {
    // e.detail.latLng including the coordinate of clicked one
    if(isAddingMode && e.detail.latLng){
      setNewCafeLocation(e.detail.latLng);  // set the coordinate, activate CafeForm appears
      setIsAddingMode(false);
    }else{
      handleClose();
    }
  };

  // function of receiving the current position of the user
  const handleUserCurrentLocation = () => {
    if(!navigator.geolocation){
      alert("您的瀏覽器不支援地理定位功能");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const {latitude, longitude} = position.coords;
        setNewCafeLocation({lat: latitude, lng: longitude});
        setIsAddingMode(false);
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location: ", error);
        alert("無法獲取您的位置，請確認瀏覽器權限，或改用點擊地圖新增。");
        setIsLocating(false);
      }
    );
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
          onClick={handleMapClick}
          style={{cursor: isAddingMode ? "crosshair" : "grab"}}
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

          {/* temporate pin */}
          {newCafeLocation && (
            <AdvancedMarker position={newCafeLocation}>
              <Pin background={"#EA4335"} glyphColor={"#FFF"} borderColor={"#B31412"}/>
            </AdvancedMarker>
          )}
        </Map>

        {/* floating botton */}
        <button
          onClick={() => {
            setIsAddingMode(!isAddingMode);
            setNewCafeLocation(null); // 重置之前的選擇
            handleClose(); // 關閉任何開啟的 InfoWindow
          }}
          className={`absolute bottom-8 left-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all z-10 
            ${isAddingMode ? "bg-red-500 text-white rotate-45" : "bg-blue-600 text-white hover:bg-blue-700"}`}
        >
          {/* 如果是新增模式顯示 X，否則顯示 + */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            className="2-8 h-8"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.7-7.5h-15"/>
          </svg>
          {/* <span className="font-bold">+</span> */}
        </button>
        
        {/* button of "using current position to add" */}
        {isAddingMode && (
          <button
            onClick={handleUserCurrentLocation}
            disabled={isLocating}
            className="absolute bottom-24 left-4 bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 hover:bg-gray-100 transition z-10 font-medium"
          >
            {isLocating ? (
              <span>📡 定位中...</span>
            ) : (
              <>
                <span>📍</span>
                <span>以目前位置新增</span>
              </>
            )}
          </button>
        )}

        {/* create new cafe form (only shows when coordinates exist) */}
        {newCafeLocation && (
          <CafeForm
            coordinates={newCafeLocation}
            onClose={() => setNewCafeLocation(null)}
            onCafeAdded={() => {
              fetchCafes();  // refetch all data of the cafes
              setNewCafeLocation(null);  // close the form
            }}
          />
        )}

        {/* prompt */}
        {isAddingMode && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-semibold pointer-events-none z-10">
            請點擊地圖，或使用右下角定位按鈕
          </div>
        )}

      </div>
    </APIProvider>
  );
}

export default App;
