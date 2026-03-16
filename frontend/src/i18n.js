import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      "search_placeholder": "Find your next coding spot...",
      "wifi_status": "WiFi Speed",
      "socket_count": "Power Outlets"
    }
  },
  zh: {
    translation: {
      "search_placeholder": "尋找你的下一個 coding 據點...",
      "wifi_status": "WiFi 速度",
      "socket_count": "插座數量"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // Default language
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;