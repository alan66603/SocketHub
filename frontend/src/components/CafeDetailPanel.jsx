import { useTranslation } from "react-i18next";

function CafeDetailPanel({ cafe, onClose, onEdit }) {
  const { t, i18n } = useTranslation();

  const socketMap = {
    many: t("socket_many_detail"),
    few: t("socket_few_detail"),
    none: t("socket_none_detail"),
    unknown: t("socket_unknown"),
  };
  const timeLimitMap = {
    limited: t("time_limited_detail"),
    unlimited: t("time_unlimited_detail"),
    unknown: t("time_unknown"),
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const locale = i18n.language.startsWith("zh") ? "zh-TW" : "en-US";
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto p-0 animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 h-32 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white rounded-full p-2 transition backdrop-blur-md"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="absolute bottom-4 left-6 text-white">
            <h2 className="text-2xl font-bold drop-shadow-md">{cafe.name}</h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {/* 地址 */}
          <div className="flex items-start gap-2 text-gray-600 mb-6">
            <span className="text-lg">📍</span>
            <p className="text-sm leading-relaxed">{cafe.location.address}</p>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              {t("tags_section")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {cafe.tags && cafe.tags.length > 0 ? (
                cafe.tags.slice(0, 8).map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400 italic">{t("no_tags")}</span>
              )}
            </div>
          </div>

          {/* 狀態 Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-xs text-gray-500 mb-1">{t("wifi_stability")}</div>
              <div className="text-xl font-bold text-blue-600">
                {cafe.ratings.wifiStability || "-"}{" "}
                <span className="text-sm text-gray-400">/ 5</span>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-xs text-gray-500 mb-1">{t("outlet_section")}</div>
              <div className="text-lg font-bold text-gray-700">
                {socketMap[cafe.features.hasManySockets] || "-"}
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-center">
              <div className="text-xs text-gray-500 mb-1">{t("time_limit_section")}</div>
              <div className="text-lg font-bold text-gray-700">
                {timeLimitMap[cafe.features.timeLimit] || "-"}
              </div>
            </div>
          </div>

          {/* 評論區 */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              💬 {t("comments_section")}
              <span className="text-sm font-normal text-gray-500">
                ({cafe.comments?.length || 0})
              </span>
            </h3>

            <div className="space-y-4">
              {cafe.comments && cafe.comments.length > 0 ? (
                [...cafe.comments].reverse().map((comment, index) => (
                  <div
                    key={index}
                    className="border-b border-gray-100 pb-4 last:border-0"
                  >
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {comment.text}
                    </p>
                    <p className="text-xs text-gray-400 mt-2 text-right">
                      {formatDate(comment.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">
                  <p>{t("no_comments")}</p>
                  <p className="text-sm">{t("no_comments_prompt")}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          <button
            onClick={onEdit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
          >
            <span>✍️</span> {t("edit_btn")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CafeDetailPanel;
