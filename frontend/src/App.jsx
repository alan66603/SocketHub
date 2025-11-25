import { useState, useEffect } from "react";
import axios from "axios";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
} from "@vis.gl/react-google-maps";

function App() {
  const defaultPosition = { lat: 25.033, lng: 121.5654 }; // Taipei 101
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // 1. define State: used to store the data of cafe from the backend
  const [cafes, setCafes] = useState([]);

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
          {/* 3. 把資料跑迴圈 (Mapping)，變成地圖上的圖釘 */}
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
            >
              {/* Form of pin and color */}
              <Pin
                background={"#FBBC04"}
                glyphColor={"#000"}
                borderColor={"#000"}
              />
            </AdvancedMarker>
          ))}
        </Map>
      </div>
    </APIProvider>
  );
}

export default App;
