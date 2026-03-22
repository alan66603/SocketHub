import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  InfoWindow,
} from "@vis.gl/react-google-maps";
import toast, { Toaster } from "react-hot-toast";
import ContributePanel from "./components/ContributePanel";
import CafeDetailPanel from "./components/CafeDetailPanel";
import TopBar from "./components/TopBar";

const socketMap = { many: "多", few: "少", none: "無" };
const timeLimitMap = { limited: "⏳ 限時", unlimited: "✅ 不限時" };

function App() {
  let savedMapState = null;
  try {
    savedMapState = JSON.parse(localStorage.getItem("socketHubMapState"));
  } catch {
    savedMapState = null;
  }

  const defaultPosition = savedMapState?.center || { lat: 25.033, lng: 121.5654 };
  const defaultZoomLevel = savedMapState?.zoom || 13;
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const API_URL = import.meta.env.VITE_API_URL || "/api/cafes";

  const [cafes, setCafes] = useState([]);
  const [activeState, setActiveState] = useState({ cafe: null, mode: null });
  const [userLocation, setUserLocation] = useState(null);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [activeCafeForContribution, setActiveCafeForContribution] = useState(null);
  const [activeCafeDetail, setActiveCafeDetail] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(defaultZoomLevel);

  const hoverTimeoutRef = useRef(null);
  const mapIdleDebounceRef = useRef(null);

  const allTags = useMemo(() => {
    const tags = new Set();
    cafes.forEach((cafe) => {
      if (cafe.tags && Array.isArray(cafe.tags)) {
        cafe.tags.forEach((tag) => tags.add(tag));
      }
    });
    return Array.from(tags);
  }, [cafes]);

  const fetchCafes = () => {
    axios
      .get(API_URL)
      .then((res) => {
        if (Array.isArray(res.data)) {
          setCafes(res.data);
        } else {
          console.error("接收到的資料不是陣列:", res.data);
          setCafes([]);
        }
      })
      .catch((err) => {
        console.error(err);
        toast.error("後端連線失敗");
      });
  };

  useEffect(() => {
    fetchCafes();
  }, []);

  const handleMapIdle = (mapEvent) => {
    const map = mapEvent.map;
    const zoom = map.getZoom();
    const center = map.getCenter();

    try {
      localStorage.setItem(
        "socketHubMapState",
        JSON.stringify({ center: { lat: center.lat(), lng: center.lng() }, zoom })
      );
    } catch {
      // ignore storage errors
    }

    setCurrentZoom(zoom);
    if (zoom < 13) return;

    // Debounce API call to avoid rapid duplicate requests
    if (mapIdleDebounceRef.current) clearTimeout(mapIdleDebounceRef.current);
    mapIdleDebounceRef.current = setTimeout(async () => {
      const lat = center.lat();
      const lng = center.lng();
      setIsLoadingGoogle(true);
      try {
        const res = await axios.post(`${API_URL}/search`, { lat, lng, radius: 1500 });
        const newCafes = res.data;
        setCafes((prevCafes) => {
          const existingIds = new Set(prevCafes.map((c) => c.googlePlaceId || c._id));
          const uniqueNewCafes = newCafes.filter(
            (c) => !existingIds.has(c.googlePlaceId || c._id)
          );
          if (uniqueNewCafes.length === 0) return prevCafes;
          return [...prevCafes, ...uniqueNewCafes];
        });
      } catch (error) {
        console.error("Hybrid search error", error);
        toast.error("無法取得附近店家資料");
      } finally {
        setIsLoadingGoogle(false);
      }
    }, 500);
  };

  const handleMouseEnter = (cafe) => {
    if (activeState.mode === "click" && activeState.cafe?._id === cafe._id) return;
    if (activeState.mode === "hover" && activeState.cafe?._id === cafe._id) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveState({ cafe: cafe, mode: "hover" });
    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (activeState.mode === "hover") setActiveState({ cafe: null, mode: null });
  };

  const handleClose = () => {
    setActiveState({ cafe: null, mode: null });
  };

  const handleClick = (cafe) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (activeState.mode === "click" && activeState.cafe?._id === cafe._id) {
      handleClose();
    } else {
      setActiveState({ cafe: cafe, mode: "click" });
    }
  };

  const handleMapClick = () => {
    handleClose();
  };

  return (
    <APIProvider apiKey={API_KEY}>
      <div className="h-screen w-full relative">
        <Toaster
          position="bottom-left"
          reverseOrder={false}
          toastOptions={{
            duration: 3000,
            style: { borderRadius: "10px", background: "#333", color: "#fff" },
          }}
        />

        <Map
          defaultCenter={defaultPosition}
          defaultZoom={defaultZoomLevel}
          mapId="DEMO_MAP_ID"
          className="w-full h-full"
          onClick={handleMapClick}
          onIdle={handleMapIdle}
          style={{ cursor: "grab" }}
          disableDefaultUI={true}
        >
          {currentZoom >= 13 &&
            cafes.map((cafe) => (
              <AdvancedMarker
                key={cafe._id}
                position={{
                  lat: cafe.location.coordinates[1],
                  lng: cafe.location.coordinates[0],
                }}
                title={cafe.name}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stop();
                  handleClick(cafe);
                }}
                onMouseEnter={() => handleMouseEnter(cafe)}
                onMouseLeave={handleMouseLeave}
              >
                <Pin
                  background={cafe.source === "google" ? "#4285F4" : "#FBBC04"}
                  glyphColor={"#FFF"}
                  borderColor={cafe.source === "google" ? "#1967D2" : "#000"}
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
              <div className="p-1 max-w-[280px]">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-800 line-clamp-1">
                    {activeState.cafe.name}
                  </h2>
                </div>

                <div className="text-sm text-gray-600 space-y-1.5">
                  <p className="flex items-start gap-1">
                    <span className="shrink-0">📍</span>
                    <span className="line-clamp-2 text-xs">
                      {activeState.cafe.location.address}
                    </span>
                  </p>

                  <div className="flex flex-wrap gap-1 my-1.5">
                    {activeState.cafe.tags &&
                      activeState.cafe.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 border border-gray-200"
                        >
                          #{tag}
                        </span>
                      ))}
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    <p>
                      📶 WiFi:{" "}
                      <span className="font-medium text-gray-800">
                        {activeState.cafe.ratings.wifiStability || "-"}
                      </span>
                    </p>
                    <p>
                      🔌 插座:{" "}
                      <span className="font-medium text-gray-800">
                        {socketMap[activeState.cafe.features.hasManySockets] || "-"}
                      </span>
                    </p>
                    <p>
                      ⏳ 限時:{" "}
                      <span className="font-medium text-gray-800">
                        {timeLimitMap[activeState.cafe.features.timeLimit] || "-"}
                      </span>
                    </p>
                    {activeState.cafe.source === "google" && (
                      <p>
                        ⭐ Google:{" "}
                        <span className="font-medium text-amber-500">
                          {activeState.cafe.ratings.googleRating}
                        </span>
                      </p>
                    )}
                  </div>

                  {activeState.cafe.comments && activeState.cafe.comments.length > 0 && (
                    <div className="mt-2 p-1.5 bg-gray-50 rounded text-xs text-gray-600 italic border-l-2 border-blue-400 line-clamp-2">
                      "{activeState.cafe.comments[activeState.cafe.comments.length - 1].text}"
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveCafeDetail(activeState.cafe);
                        handleClose();
                      }}
                      className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 py-1.5 rounded text-xs font-bold transition"
                    >
                      更多資訊
                    </button>
                    <button
                      onClick={() => {
                        setActiveCafeForContribution(activeState.cafe);
                        handleClose();
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-xs font-bold transition"
                    >
                      ✍️ 貢獻
                    </button>
                  </div>
                </div>
              </div>
            </InfoWindow>
          )}

          {userLocation && (
            <AdvancedMarker position={userLocation} zIndex={100}>
              <Pin background={"#EA4335"} glyphColor={"#FFF"} borderColor={"#FFF"} />
            </AdvancedMarker>
          )}
        </Map>

        <TopBar
          cafes={cafes}
          onSelectCafe={(cafe) => setActiveState({ cafe, mode: "click" })}
          onUserLocationUpdate={(loc) => setUserLocation(loc)}
        />

        {isLoadingGoogle && (
          <div className="absolute top-20 right-4 bg-white/90 px-3 py-1 rounded-full shadow text-xs font-medium text-gray-500 z-50 flex items-center gap-2 border border-gray-100">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            搜尋附近...
          </div>
        )}

        {activeCafeForContribution && (
          <ContributePanel
            cafe={activeCafeForContribution}
            existingTags={allTags}
            onClose={() => setActiveCafeForContribution(null)}
            onCafeUpdated={() => {
              setActiveCafeForContribution(null);
              fetchCafes();
            }}
          />
        )}

        {activeCafeDetail && (
          <CafeDetailPanel
            cafe={activeCafeDetail}
            onClose={() => setActiveCafeDetail(null)}
            onEdit={() => {
              setActiveCafeForContribution(activeCafeDetail);
              setActiveCafeDetail(null);
            }}
          />
        )}
      </div>
    </APIProvider>
  );
}

export default App;
