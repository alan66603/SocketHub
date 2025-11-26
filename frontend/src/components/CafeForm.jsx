import { useState } from "react";
import axios from "axios";

// 這裡接收三個 props:
// 1. coordinates: 從地圖點擊傳來的經緯度
// 2. onClose: 關閉表單的函式
// 3. onCafeAdded: 新增成功後通知 App 更新地圖的函式
function CafeForm({ coordinates, onClose, onCafeAdded, existingTags = [] }) {
  const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5001/api/cafes";

  // 表單狀態
  const [formData, setFormData] = useState({
    name: "",
    address: "", // 這裡先讓使用者手填，進階版可以用 Google Geocoding API 自動轉
    wifiStability: 3,
    socketAvailability: "few",
    limitedTime: "limited",
  });

  const [tags, setTags] = useState([]); // currently chosen tags
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 處理欄位變更
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const newTag = tagInput.trim();

      // context that has not be added
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setTagInput("");
      }
    }
  };

  const handleAddExistingTag = (tag) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // 送出表單
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newCafe = {
      name: formData.name,
      location: {
        type: "Point",
        coordinates: [coordinates.lng, coordinates.lat], // MongoDB 格式: [lng, lat]
        address: formData.address,
      },
      tags: tags,
      ratings: {
        wifiStability: Number(formData.wifiStability),
      },
      features: {
        hasManySockets: formData.socketAvailability, // 對應後端欄位
        timeLimit: formData.limitedTime, // 對應後端欄位
      },
    };

    try {
      // 發送 POST 請求給後端
      await axios.post(API_URL, newCafe);
      alert("新增成功！🎉");
      onCafeAdded(); // 通知父元件重抓資料
      onClose(); // 關閉表單
    } catch (error) {
      console.error("Error adding cafe:", error);
      alert("新增失敗，請檢查後端連線");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-50 bg-white p-6 rounded-lg shadow-xl w-80 max-h-[85vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">☕ 新增咖啡廳</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
          📍 {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            店名
          </label>
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="mt-1 w-full border rounded-md p-2"
            placeholder="例如: 路易莎信義店"
          />
        </div>

        {/* ✨ Tags 區塊 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            標籤 (Tags)
          </label>

          {/* Tag 輸入框 */}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            className="mt-1 w-full border rounded-md p-2"
            placeholder="輸入標籤後按 Enter (如: 安靜)"
          />

          {/* 已選取的 Tags (Chips) */}
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-900 font-bold"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* 既有 Tags 建議 (排除掉已經選的) */}
          {existingTags.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">常用標籤：</p>
              <div className="flex flex-wrap gap-1">
                {existingTags
                  .filter((tag) => !tags.includes(tag))
                  .slice(0, 5) // 只顯示前 5 個建議，避免太長
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddExistingTag(tag)}
                      className="text-xs border border-gray-300 px-2 py-1 rounded-full text-gray-600 hover:bg-gray-100"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            地址
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="mt-1 w-full border rounded-md p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            WiFi 穩定度
          </label>
          <input
            type="range"
            name="wifiStability"
            min="1"
            max="5"
            step="0.5"
            value={formData.wifiStability}
            onChange={handleChange}
            className="w-full"
          />
          <div className="text-right text-sm text-blue-600">
            {formData.wifiStability} ⭐
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              插座
            </label>
            <select
              name="socketAvailability"
              value={formData.socketAvailability}
              onChange={handleChange}
              className="mt-1 w-full border rounded-md p-2"
            >
              <option value="many">很多</option>
              <option value="few">少量</option>
              <option value="none">沒有</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              限時
            </label>
            <select
              name="limitedTime"
              value={formData.limitedTime}
              onChange={handleChange}
              className="mt-1 w-full border rounded-md p-2"
            >
              <option value="limited">限時</option>
              <option value="unlimited">不限時</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:bg-gray-400"
        >
          {isSubmitting ? "儲存中..." : "確認新增"}
        </button>
      </form>
    </div>
  );
}

export default CafeForm;
