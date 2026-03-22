import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

function ContributePanel({ cafe, onClose, onCafeUpdated, existingTags = [] }) {
  const { t } = useTranslation();
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

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = tagInput.trim();

      if (!val) return;

      if (tags.length >= maxTagAmount) {
        toast.error(t("tag_max_error", { count: maxTagAmount }));
        return;
      }

      if (val.length < minTagLength) {
        toast.error(t("tag_too_short", { count: minTagLength }));
        return;
      }

      const validCharCount = (val.match(/[a-zA-Z\u4e00-\u9fa5]/g) || []).length;
      if (validCharCount < 2) {
        toast.error(t("tag_invalid_chars"));
        return;
      }

      if (val && !tags.includes(val) && !cafe.tags?.includes(val)) {
        setTags([...tags, val]);
        setTagInput("");
      } else {
        toast.error(t("tag_duplicate"));
        setTagInput("");
      }
    }
  };

  const handleAddTag = (tag) => {
    if (tags.length >= maxTagAmount) {
      toast.error(t("tag_max_error", { count: maxTagAmount }));
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
      loading: t("submit_loading"),
      success: t("submit_success"),
      error: t("submit_error"),
    });

    try {
      await postPromise;
      onCafeUpdated();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto p-6 animate-slide-in-right">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">📝 {t("contribute_title")}</h2>
            <p className="text-sm text-blue-600 font-medium mt-1">{cafe.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t("add_tag_label")}
            </label>
            <input
              type="text"
              list="tag-options"
              value={tagInput}
              maxLength={8}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder={t("tag_input_placeholder")}
            />

            <datalist id="tag-options">
              {existingTags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>

            <div className="flex flex-wrap gap-2 mt-3">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                >
                  #{tag}{" "}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((x) => x !== tag))}
                    className="hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {existingTags.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-2">{t("suggested_tags")}</p>
                <div className="flex flex-wrap gap-2">
                  {existingTags
                    .filter((tag) => !tags.includes(tag))
                    .slice(0, 10)
                    .map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        className="text-xs border border-gray-200 hover:bg-gray-50 px-2 py-1 rounded-md text-gray-600"
                      >
                        + {tag}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* WiFi */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t("wifi_label")}
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
                {t("outlet_label")}
              </label>
              <select
                value={socket}
                onChange={(e) => setSocket(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
              >
                <option value="unknown">{t("no_update")}</option>
                <option value="many">{t("outlet_many")}</option>
                <option value="few">{t("outlet_few")}</option>
                <option value="none">{t("outlet_none")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {t("time_limit_label")}
              </label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 bg-white"
              >
                <option value="unknown">{t("no_update")}</option>
                <option value="limited">{t("time_limited_option")}</option>
                <option value="unlimited">{t("time_unlimited_option")}</option>
              </select>
            </div>
          </div>

          {/* 評論 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {t("comment_label")}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={200}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm h-28 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder={t("comment_placeholder")}
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
              {isSubmitting ? t("submitting") : t("submit_btn")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContributePanel;
