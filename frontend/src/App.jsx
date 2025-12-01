import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import CafeForm from "./components/CafeForm";
import ContributePanel from "./components/ContributePanel";

const socketMap = { many: "多", few: "少", none: "無" };
const timeLimitMap = { limited: "⏳ 限時", unlimited: "✅ 不限時" };

// ✨ 1. 新增 TopBar 元件 (處理搜尋與移動地圖)
function TopBar({ cafes, onSelectCafe, onUserLocationUpdate }) {
  const map = useMap(); // 取得地圖實體
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLocating, setIsLocating] = useState(false);

  // 處理搜尋
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim() === "") {
      setSearchResults([]);
      return;
    }
    const results = cafes.filter(
      (cafe) =>
        cafe.name.toLowerCase().includes(query.toLowerCase()) ||
        cafe.location.address.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(results);
  };

  // 點擊搜尋結果
  const handleResultClick = (cafe) => {
    if (map) {
      map.panTo({
        lat: cafe.location.coordinates[1],
        lng: cafe.location.coordinates[0],
      });
      map.setZoom(16);
      onSelectCafe(cafe);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  // 定位到目前位置 (移動地圖中心)
  const handleLocateMe = () => {
    if (!navigator.geolocation) return alert("不支援定位");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const pos = { lat: latitude, lng: longitude };

        if (map) {
          map.panTo(pos);
          map.setZoom(15);
        }

        onUserLocationUpdate(pos);

        setIsLocating(false);
      },
      () => {
        alert("無法獲取位置");
        setIsLocating(false);
      }
    );
  };

  return (
    <div className="absolute top-0 left-0 w-full z-[100] pointer-events-none p-4 flex items-start justify-between">
      {/* 搜尋區塊 */}
      <div className="pointer-events-auto flex items-center gap-4 w-full max-w-md bg-white shadow-lg rounded-full px-4 py-2">
        <h1 className="text-lg font-bold text-blue-600 hidden sm:block whitespace-nowrap mr-2">
          SocketHub ☕
        </h1>
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="搜尋咖啡廳..."
            className="w-full bg-transparent outline-none text-sm"
            value={searchQuery}
            onChange={handleSearch}
          />
          {searchResults.length > 0 && (
            <div className="absolute top-12 left-0 w-full bg-white shadow-xl rounded-lg max-h-60 overflow-y-auto border border-gray-100 z-50">
              {searchResults.map((cafe) => (
                <div
                  key={cafe._id}
                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b last:border-0"
                  onClick={() => handleResultClick(cafe)}
                >
                  <div className="font-bold text-gray-800">{cafe.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {cafe.location.address}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="text-gray-400">🔍</span>
      </div>

      <button
        onClick={handleLocateMe}
        disabled={isLocating}
        className={`pointer-events-auto cursor-pointer ml-2 flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition ${isLocating ? 'bg-blue-100 text-blue-600' : 'bg-white hover:bg-gray-100 text-gray-600'}`}
        title="回到目前位置"
      >
        {isLocating ? "..." : "📍"}
      </button>
    </div>
  );
}

function App() {
  const defaultPosition = { lat: 25.033, lng: 121.5654 }; // Taipei 101
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const API_URL = import.meta.env.DEV 
  ? "http://localhost:8080/api/cafes"
  : import.meta.env.VITE_API_URL;

  // 1. define State: used to store the data of cafe from the backend
  const [cafes, setCafes] = useState([]);
  const [activeState, setActiveState] = useState({
    cafe: null,
    mode: null, // 'hover' or 'click'
  });

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newCafeLocation, setNewCafeLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);

  const hoverTimeoutRef = useRef(null);

  const [activeCafeForContribution, setActiveCafeForContribution] = useState(null);  // control the display of sidebar
  const [currentZoom, setCurrentZoom] = useState(13);

  const allTags = useMemo(() => {
    const tags = new Set();
    cafes.forEach((cafe) => {
      // 確保 tags 存在且是陣列才跑迴圈
      if (cafe.tags && Array.isArray(cafe.tags)) {
        cafe.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags);
  }, [cafes]);

  // 2. useEffect: Once the page was loaded, it goes to fetch the data from the backend
  const fetchCafes = () => {
    axios
      .get(API_URL)
      .then((res) => setCafes(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchCafes();
  }, []);

  const handleMapIdle = async (mapEvent) => {
    const map = mapEvent.map;
    const zoom = map.getZoom();

    setCurrentZoom(zoom);
    // cost effeciency: no searching if zoom out too much
    if(zoom < 13) return;

    const center = map.getCenter();
    const lat = center.lat();
    const lng = center.lng();

    setIsLoadingGoogle(true);

    try{
      const res = await axios.post(`${API_URL}/search`, {
        lat,
        lng,
        radius: 1500,
      });
      const newCafes = res.data;

      // De-duplication
      setCafes((prevCafes) => {
        const existingIds = new Set(prevCafes.map((c) => c.googlePlaceId || c._id));

        const uniqueNewCafes = newCafes.filter((c) => !existingIds.has(c.googlePlaceId || c._id));

        // no state updating if no new data
        if (uniqueNewCafes.length === 0) return prevCafes;

        return [...prevCafes, ...uniqueNewCafes];
      })
    }catch(error){
      console.error("Hybrid search error", error);
    }finally{
      setIsLoadingGoogle(false);
    }
  };

  // mouse enter
  const handleMouseEnter = (cafe) => {
    // 🛑 防呆 1：如果現在已經是「鎖定模式 (Click)」，且滑鼠指的正是同一家店，什麼都別做 (別干擾鎖定)
    if (activeState.mode === "click" && activeState.cafe?._id === cafe._id)
      return;
    // 🛑 防呆 2：如果現在已經是「預覽模式 (Hover)」，且顯示的也是這家店，不要重置計時器 (解決滑鼠微動重置問題)
    if (activeState.mode === "hover" && activeState.cafe?._id === cafe._id)
      return;
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
    if (activeState.mode === "hover")
      setActiveState({ cafe: null, mode: null });
  };

  const handleClose = () => {
    setActiveState({ cafe: null, mode: null });
  };

  const handleClick = (cafe) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (isAddingMode) return;
    if (activeState.mode === "click" && activeState.cafe?._id === cafe._id) {
      handleClose();
    } else {
      setActiveState({ cafe: cafe, mode: "click" });
    }
  };

  const handleMapClick = (e) => {
    // e.detail.latLng including the coordinate of clicked one
    if (isAddingMode && e.detail.latLng) {
      setNewCafeLocation(e.detail.latLng); // set the coordinate, activate CafeForm appears
      setIsAddingMode(false);
    } else {
      handleClose();
    }
  };

  // function of receiving the current position of the user
  const handleUserCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("您的瀏覽器不支援地理定位功能");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setNewCafeLocation({ lat: latitude, lng: longitude });
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
    <APIProvider apiKey={API_KEY}>
      <div className="h-screen w-full relative">
        
        {/* 1. 地圖層 (最底層) */}
        <Map
          defaultCenter={defaultPosition}
          defaultZoom={13}
          mapId="DEMO_MAP_ID"
          className="w-full h-full"
          onClick={handleMapClick}
          onIdle={handleMapIdle}
          style={{ cursor: isAddingMode ? "crosshair" : "grab" }}
          disableDefaultUI={true}
        >
          {/* ✨ 修正：只有在 Zoom >= 13 時才顯示圖釘 */}
          {currentZoom >= 13 && cafes.map((cafe) => (
            <AdvancedMarker
              key={cafe._id}
              position={{
                lat: cafe.location.coordinates[1],
                lng: cafe.location.coordinates[0],
              }}
              title={cafe.name}
              className="cursor-pointer"
              onClick={(e) => { e.stop(); handleClick(cafe); }}
              onMouseEnter={() => handleMouseEnter(cafe)}
              onMouseLeave={handleMouseLeave}
            >
              <Pin 
                // 視覺區隔：Google 來源顯示藍色，Hybrid/Local 顯示黃色
                background={cafe.source === 'google' ? "#4285F4" : "#FBBC04"} 
                glyphColor={"#FFF"} 
                borderColor={cafe.source === 'google' ? "#1967D2" : "#000"}
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
                {/* ✨ 優化：限制最大寬度 */}
                <div className="p-1 max-w-[220px]">
                 <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-base font-bold text-gray-800 line-clamp-1">{activeState.cafe.name}</h2>
                    {activeState.cafe.source === 'google' && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded-full border border-blue-200 whitespace-nowrap">Google</span>
                    )}
                 </div>
                 
                 <div className="text-sm text-gray-600 space-y-1.5">
                   <p className="flex items-start gap-1">
                     <span className="shrink-0">📍</span> 
                     <span className="line-clamp-2 text-xs">{activeState.cafe.location.address}</span>
                   </p>
                   
                   <div className="flex flex-wrap gap-1 my-1.5">
                     {activeState.cafe.tags && activeState.cafe.tags.slice(0, 3).map(tag => (
                       <span key={tag} className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200">#{tag}</span>
                     ))}
                   </div>

                   <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                      <p>📶 WiFi: <span className="font-medium text-gray-800">{activeState.cafe.ratings.wifiStability || '-'}</span></p>
                      <p>🔌 插座: <span className="font-medium text-gray-800">{socketMap[activeState.cafe.features.hasManySockets] || '-'}</span></p>
                      <p>⏳ 限時: <span className="font-medium text-gray-800">{timeLimitMap[activeState.cafe.features.timeLimit] || '-'}</span></p>
                      {activeState.cafe.source === 'google' && (
                        <p>⭐ Google: <span className="font-medium text-amber-500">{activeState.cafe.ratings.googleRating}</span></p>
                      )}
                   </div>

                   {/* 顯示最新評論 (如果有) */}
                   {activeState.cafe.comments && activeState.cafe.comments.length > 0 && (
                      <div className="mt-2 p-1.5 bg-gray-50 rounded text-xs text-gray-600 italic border-l-2 border-blue-400 line-clamp-2">
                        "{activeState.cafe.comments[activeState.cafe.comments.length - 1].text}"
                      </div>
                   )}

                   <button
                     onClick={() => {
                        setActiveCafeForContribution(activeState.cafe); // 打開側邊欄
                        handleClose(); 
                     }}
                     className="mt-3 w-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1"
                   >
                     <span>✍️</span> 貢獻 / 編輯
                   </button>
                 </div>
               </div>
             </InfoWindow>
          )}

          {userLocation && (
            <AdvancedMarker position={userLocation} zIndex={100}>
              <Pin background={"#EA4335"} glyphColor={"#FFF"} borderColor={"#FFF"} />
            </AdvancedMarker>
          )}

          {newCafeLocation && (
            <AdvancedMarker position={newCafeLocation}>
              <Pin background={"#EA4335"} glyphColor={"#FFF"} borderColor={"#B31412"} />
            </AdvancedMarker>
          )}
        </Map>

        {/* 2. UI 層 (浮在地圖上面) */}
        
        <TopBar 
          cafes={cafes} 
          onSelectCafe={(cafe) => setActiveState({ cafe, mode: "click" })}
          onUserLocationUpdate={(loc) => setUserLocation(loc)} 
        />

        {/* 左下角常駐定位按鈕 */}
        <button
          onClick={handleUserCurrentLocation}
          disabled={isLocating}
          className="absolute bottom-24 left-4 w-12 h-12 bg-white rounded-full shadow-lg text-gray-600 flex items-center justify-center hover:bg-gray-50 z-50 transition border border-gray-100"
          title="定位目前位置"
        >
           {isLocating ? (
             <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
           ) : (
             <span className="text-xl">📍</span>
           )}
        </button>

        {/* FAB Buttons (新增按鈕) */}
        <button
          onClick={() => {
            setIsAddingMode(!isAddingMode);
            setNewCafeLocation(null);
            handleClose();
          }}
          className={`absolute bottom-8 left-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all duration-300 z-50 
            ${isAddingMode ? "bg-red-500 text-white rotate-45" : "bg-blue-600 text-white hover:bg-blue-700"}`}
        >
          {/* ✨ 修正 SVG class */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
        
        {/* 新增模式下的「在此處新增」按鈕 */}
        {isAddingMode && (
          <button
            onClick={() => {
                // 如果已經定位過了 (userLocation 存在)，直接用它
                if (userLocation) {
                    setNewCafeLocation(userLocation);
                    setIsAddingMode(false);
                } else {
                    handleUserCurrentLocation(); // 否則重新定位
                }
            }}
            className="absolute bottom-24 left-20 bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 hover:bg-gray-100 transition z-50 font-medium border border-gray-100"
          >
            <span>📍</span><span>在此處新增</span>
          </button>
        )}

        {/* Loading Indicator */}
        {isLoadingGoogle && (
          <div className="absolute top-20 right-4 bg-white/90 px-3 py-1 rounded-full shadow text-xs font-medium text-gray-500 z-50 flex items-center gap-2 border border-gray-100">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            搜尋附近...
          </div>
        )}

        {isAddingMode && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-gray-800/90 text-white px-4 py-2 rounded-full text-sm font-semibold pointer-events-none z-50 whitespace-nowrap shadow-lg backdrop-blur-sm">
            請點擊地圖位置
          </div>
        )}

        {/* 新增表單 */}
        {newCafeLocation && (
          <CafeForm 
            coordinates={newCafeLocation} 
            existingTags={allTags}
            onClose={() => setNewCafeLocation(null)}
            onCafeAdded={() => { fetchCafes(); setNewCafeLocation(null); }}
          />
        )}

        {/* ✨ 編輯/貢獻側邊欄 */}
        {activeCafeForContribution && (
          <ContributePanel
            cafe={activeCafeForContribution}
            existingTags={allTags}
            onClose={() => setActiveCafeForContribution(null)}
            onCafeUpdated={() => {
                setActiveCafeForContribution(null);
                window.location.reload(); 
            }}
          />
        )}
      </div>
    </APIProvider>
  );
}  

export default App;
