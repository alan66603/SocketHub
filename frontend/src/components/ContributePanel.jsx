import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

function ContributePanel({ cafe, onClose, onCafeUpdated, existingTags = [] }) {
  const API_URL = import.meta.env.VITE_API_URL || "/api/cafes";
  const POST_URL = `${API_URL}/contribute`;

  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState([]);
  const [wifi, setWifi] = useState(0);
  const [socket, setSocket] = useState("unknown");
  const [time, setTime] = useState("unknown");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const maxTagAmount = 5;
  const minTagLength = 3;

  // 處理 Tag 輸入
  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = tagInput.trim();

      if (!val) return;

      if (tags.length >= maxTagAmount) {
        toast.error(`最多新增 ${maxTagAmount} 個標籤！`);
        return;
      }

      if (val.length < minTagLength) {
        toast.error(`標籤太短了，請至少輸入 ${minTagLength} 個字!`);
        return;
      }

      const validCharCount = (val.match(/[a-zA-Z\u4e00-\u9fa5]/g) || []).length;

      if (validCharCount < 2) {
        toast.error("請包含至少 2 個中英文字母！");
        return;
      }

      if (val && !tags.includes(val) && !cafe.tags?.includes(val)) {
        setTags([...tags, val]);
        setTagInput("");
      } else {
        toast.error("這個標籤已經有了哦！");
        setTagInput("");
      }
    }
  };

  const handleAddTag = (tag) => {
    if (tags.length >= maxTagAmount) {
      toast.error(`最多新增 ${maxTagAmount} 個標籤！`);
      return;
    }
    if (!tags.includes(tag)) setTags([...tags, tag]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = {
      googlePlaceId: cafe.googlePlaceId,
      name: cafe.name,
      address: cafe.location.address,
      lat: cafe.location.coordinates[1],
      lng: cafe.location.coordinates[0],
      newTags: tags,
      wifiRating: wifi > 0 ? wifi : null,
      socketStatus: socket,
      timeStatus: time,
      comment: comment,
    };

    const postPromise = axios.post(POST_URL, payload);

    toast.promise(postPromise, {
      loading: "正在提交貢獻...",
      success: "感謝您的貢獻！資料已更新 🎉",
      error: "提交失敗，請稍後再試",
    });

    try {
      await postPromise;
      onCafeUpdated(); // 通知 App 刷新
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // 遮罩層 (點擊背景關閉)
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* 右側滑入面板 */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto p-6 animate-slide-in-right">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">📝 貢獻資訊</h2>
            <p className="text-sm text-blue-600 font-medium mt-1">
              {cafe.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              新增標籤 (Tag)
            </label>
            <input
              type="text"
              list="tag-options"
              value={tagInput}
              maxLength={8}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="輸入標籤後按 Enter (最多8字)"
            />

            <datalist id="tag-options">
              {existingTags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>

            {/* 已選 Tags */}
            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((t) => (
                <span
                  key={t}
                  className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                >
                  #{t}{" "}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== t))}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* 建議 Tags */}
            {existingTags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-2">常用標籤：</p>
                <div className="flex flex-wrap gap-2">
                  {existingTags
                    .filter((t) => !tags.includes(t))
                    .slice(0, 10)
                    .map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleAddTag(t)}
                        className="text-xs border border-gray-200 hover:bg-gray-50 px-2 py-1 rounded-md text-gray-600"
                      >
                        + {t}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* WiFi */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              WiFi 穩定度 (不評分請留 0)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={wifi}
                onChange={(e) => setWifi(e.target.value)}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-lg font-bold text-blue-600 w-8 text-right">
                {wifi > 0 ? wifi : "-"}
              </span>
            </div>
          </div>

          {/* 插座 & 限時 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                插座數量
              </label>
              <select
                value={socket}
                onChange={(e) => setSocket(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
              >
                <option value="unknown">不更新</option>
                <option value="many">很多</option>
                <option value="few">少量</option>
                <option value="none">沒有</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                限時狀況
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
              >
                <option value="unknown">不更新</option>
                <option value="limited">限時</option>
                <option value="unlimited">不限時</option>
              </select>
            </div>
          </div>

          {/* 評論 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              留言評論
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={200}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm h-28 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="分享一下這裡的環境、咖啡好不好喝..."
            />
            <p
              className={`text-xs text-right mt-1 ${comment.length >= 180 ? "text-red-400" : "text-gray-400"}`}
            >
              {comment.length} / 200
            </p>
          </div>

          {/* 按鈕 */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:bg-gray-400"
            >
              {isSubmitting ? "提交中..." : "確認貢獻"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContributePanel;
