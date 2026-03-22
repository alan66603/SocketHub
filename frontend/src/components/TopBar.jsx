import { useState } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

function TopBar({ cafes, onSelectCafe, onUserLocationUpdate }) {
  const map = useMap();
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isLocating, setIsLocating] = useState(false);

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
        cafe.location.address.toLowerCase().includes(query.toLowerCase()),
    );
    setSearchResults(results);
  };

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

  const handleLocateMe = () => {
    if (!navigator.geolocation) return toast.error(t("geolocation_not_supported"));
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
        toast.error(t("location_error"));
        setIsLocating(false);
      },
    );
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language.startsWith("zh") ? "en" : "zh");
  };

  return (
    <div className="absolute top-0 left-0 w-full z-[100] pointer-events-none p-4 flex items-start justify-between">
      <div className="pointer-events-auto flex items-center gap-4 w-full max-w-md bg-white shadow-lg rounded-full px-4 py-2">
        <h1 className="text-lg font-bold text-blue-600 hidden sm:block whitespace-nowrap mr-2">
          SocketHub ☕
        </h1>
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={t("search_placeholder")}
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

      <div className="pointer-events-auto flex items-center gap-2 ml-2">
        <button
          onClick={toggleLanguage}
          className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg bg-white hover:bg-gray-100 text-gray-700 text-sm font-bold transition"
          aria-label="Toggle language"
        >
          {i18n.language.startsWith("zh") ? "EN" : "中"}
        </button>

        <button
          onClick={handleLocateMe}
          disabled={isLocating}
          className={`cursor-pointer flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition ${isLocating ? "bg-blue-100 text-blue-600" : "bg-white hover:bg-gray-100 text-gray-600"}`}
          title={t("locate_me")}
          aria-label={t("locate_me")}
        >
          {isLocating ? "..." : "📍"}
        </button>
      </div>
    </div>
  );
}

export default TopBar;
