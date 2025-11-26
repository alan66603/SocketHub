import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";

function App() {
  const defaultPosition = { lat: 25.033, lng: 121.5654 }; // Taipei 101
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // 1. define State: used to store the data of cafe from the backend
  const [cafes, setCafes] = useState([]);
  const [selectedCafe, setSelectedCafe] = useState(null);

  const hoverTimeoutRef = useRef(null);

  const socketMap = {
    many: "多",
    few: "少",
    none: "無",
  };

  const timeLimitMap = {
    limited: "⏳ 限時",
    unlimited: "✅ 不限時",
  };

  // 2. useEffect: Once the page was loaded, it goes to fetch the data from the backend
  useEffect(() => {
    axios
      .get("http://localhost:8080/api/cafes")
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
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }

    hoverTimeoutRef.current = setTimeout(() => {
      setSelectedCafe(cafe);
    }, 500); // 500 ms (0.5 sec)
  };

  // mouse leave
  const handleMouseLeave = () => {
    // if leave before 500 ms countdown, cancel the countdown
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // close the window after mouse leave
    setSelectedCafe(null);
  };

  const handleClick = (cafe) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setSelectedCafe(cafe);
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

          {selectedCafe && (
            <InfoWindow
              position={{
                lat: selectedCafe.location.coordinates[1],
                lng: selectedCafe.location.coordinates[0],
              }}
              onCloseClick={() => setSelectedCafe(null)}
              minWidth={200}
            >
              <div className="p-2">
                <h2 className="text-lg font-bold mb-2">{selectedCafe.name}</h2>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>📍 {selectedCafe.location.address}</p>
                  <p>📶 WiFi 穩定度: {selectedCafe.ratings.wifiStability} ⭐</p>
                  <p>
                    🔌 插座數量:{" "}
                    {socketMap[selectedCafe.features.socketAvailability]}
                  </p>
                  <p className="mt-2 text-blue-600 font-semibold">
                    {timeLimitMap[selectedCafe.features.limitedTime]}
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
