import { useTranslation } from "react-i18next";

function FilterPanel({ filters, setFilters, userLocation }) {
  const { t } = useTranslation();

  const toggleArrayValue = (key, value) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));

  const handleReset = () =>
    setFilters({ minWifi: 0, outlets: [], timeLimit: [], sortBy: "default" });

  const toggleBtn = (active) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
      active
        ? "bg-blue-600 text-white border-blue-600"
        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
    }`;

  return (
    <div className="absolute right-0 top-12 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-gray-800">{t("filter_title")}</span>
        <button
          onClick={handleReset}
          className="text-xs text-blue-600 hover:underline"
        >
          {t("filter_reset")}
        </button>
      </div>

      {/* Min WiFi */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          {t("min_wifi")}
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0"
            max="5"
            step="0.5"
            value={filters.minWifi}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, minWifi: Number(e.target.value) }))
            }
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-sm font-bold text-blue-600 w-10 text-right">
            {filters.minWifi > 0 ? filters.minWifi : t("any")}
          </span>
        </div>
      </div>

      {/* Outlets */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          {t("filter_outlet")}
        </label>
        <div className="flex gap-2 flex-wrap">
          {["many", "few", "none"].map((val) => (
            <button
              key={val}
              onClick={() => toggleArrayValue("outlets", val)}
              className={toggleBtn(filters.outlets.includes(val))}
            >
              {t(`outlet_${val}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Time Limit */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          {t("filter_time_limit")}
        </label>
        <div className="flex gap-2 flex-wrap">
          {["limited", "unlimited"].map((val) => (
            <button
              key={val}
              onClick={() => toggleArrayValue("timeLimit", val)}
              className={toggleBtn(filters.timeLimit.includes(val))}
            >
              {t(`time_${val}_option`)}
            </button>
          ))}
        </div>
      </div>

      {/* Sort By */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          {t("sort_by")}
        </label>
        <div className="flex gap-2 flex-wrap">
          {["default", "wifi", "distance"].map((val) => {
            const disabled = val === "distance" && !userLocation;
            return (
              <button
                key={val}
                onClick={() =>
                  !disabled && setFilters((prev) => ({ ...prev, sortBy: val }))
                }
                disabled={disabled}
                title={disabled ? "Locate yourself first" : undefined}
                className={`${toggleBtn(filters.sortBy === val)} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {t(`sort_${val}`)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default FilterPanel;
