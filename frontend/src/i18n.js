import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  zh: {
    translation: {
      // TopBar
      search_placeholder: "搜尋咖啡廳...",
      locate_me: "回到目前位置",
      geolocation_not_supported: "不支援定位",
      location_error: "無法獲取位置",

      // App - InfoWindow maps
      socket_many: "多",
      socket_few: "少",
      socket_none: "無",
      time_limited: "⏳ 限時",
      time_unlimited: "✅ 不限時",

      // App - InfoWindow UI
      outlets: "插座",
      time_limit: "限時",
      more_info: "更多資訊",
      contribute: "貢獻",
      searching_nearby: "搜尋附近...",
      backend_error: "後端連線失敗",
      nearby_error: "無法取得附近店家資料",

      // ContributePanel
      contribute_title: "貢獻資訊",
      add_tag_label: "新增標籤 (Tag)",
      tag_input_placeholder: "輸入標籤後按 Enter (最多8字)",
      suggested_tags: "常用標籤：",
      wifi_label: "WiFi 穩定度 (不評分請留 0)",
      outlet_label: "插座數量",
      time_limit_label: "限時狀況",
      comment_label: "留言評論",
      comment_placeholder: "分享一下這裡的環境、咖啡好不好喝...",
      submit_btn: "確認貢獻",
      submitting: "提交中...",
      submit_loading: "正在提交貢獻...",
      submit_success: "感謝您的貢獻！資料已更新 🎉",
      submit_error: "提交失敗，請稍後再試",
      tag_max_error: "最多新增 {{count}} 個標籤！",
      tag_too_short: "標籤太短了，請至少輸入 {{count}} 個字!",
      tag_invalid_chars: "請包含至少 2 個中英文字母！",
      tag_duplicate: "這個標籤已經有了哦！",
      no_update: "不更新",
      outlet_many: "很多",
      outlet_few: "少量",
      outlet_none: "沒有",
      time_limited_option: "限時",
      time_unlimited_option: "不限時",

      // CafeDetailPanel
      tags_section: "標籤",
      no_tags: "尚無標籤",
      wifi_stability: "WiFi 穩定度",
      outlet_section: "插座",
      time_limit_section: "限時",
      comments_section: "評論",
      no_comments: "還沒有人留言過...",
      no_comments_prompt: "成為第一個分享心得的人吧！",
      edit_btn: "我要補充 / 評分",
      socket_many_detail: "很多",
      socket_few_detail: "少量",
      socket_none_detail: "沒有",
      socket_unknown: "未知",
      time_limited_detail: "有限時",
      time_unlimited_detail: "不限時",
      time_unknown: "未知",
    },
  },
  en: {
    translation: {
      // TopBar
      search_placeholder: "Search cafes...",
      locate_me: "Locate me",
      geolocation_not_supported: "Geolocation not supported",
      location_error: "Unable to get location",

      // App - InfoWindow maps
      socket_many: "Many",
      socket_few: "Few",
      socket_none: "None",
      time_limited: "⏳ Limited",
      time_unlimited: "✅ Unlimited",

      // App - InfoWindow UI
      outlets: "Outlets",
      time_limit: "Time",
      more_info: "More Info",
      contribute: "Contribute",
      searching_nearby: "Searching nearby...",
      backend_error: "Backend connection failed",
      nearby_error: "Failed to fetch nearby cafes",

      // ContributePanel
      contribute_title: "Contribute Info",
      add_tag_label: "Add Tag",
      tag_input_placeholder: "Type and press Enter (max 8 chars)",
      suggested_tags: "Common tags:",
      wifi_label: "WiFi Stability (0 = skip)",
      outlet_label: "Power Outlets",
      time_limit_label: "Time Limit",
      comment_label: "Comment",
      comment_placeholder: "Share your experience here...",
      submit_btn: "Submit",
      submitting: "Submitting...",
      submit_loading: "Submitting contribution...",
      submit_success: "Thank you! Data updated 🎉",
      submit_error: "Submission failed, please try again",
      tag_max_error: "Max {{count}} tags!",
      tag_too_short: "Tag too short, min {{count}} chars!",
      tag_invalid_chars: "Please include at least 2 letters!",
      tag_duplicate: "This tag already exists!",
      no_update: "No update",
      outlet_many: "Many",
      outlet_few: "Few",
      outlet_none: "None",
      time_limited_option: "Limited",
      time_unlimited_option: "Unlimited",

      // CafeDetailPanel
      tags_section: "Tags",
      no_tags: "No tags yet",
      wifi_stability: "WiFi Stability",
      outlet_section: "Outlets",
      time_limit_section: "Time Limit",
      comments_section: "Comments",
      no_comments: "No comments yet...",
      no_comments_prompt: "Be the first to share!",
      edit_btn: "Add Info / Rate",
      socket_many_detail: "Many",
      socket_few_detail: "Few",
      socket_none_detail: "None",
      socket_unknown: "Unknown",
      time_limited_detail: "Limited",
      time_unlimited_detail: "Unlimited",
      time_unknown: "Unknown",
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
