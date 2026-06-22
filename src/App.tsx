import React, { useEffect } from "react";
import { AppRouter } from "./AppRouter";
import { InstallPrompt } from "./pages/Seller/InstallPrompt";
import { useTranslation } from "react-i18next";

const App: React.FC = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const handleLangChange = (lng: string) => {
      if (!lng) return;
      const cleanLng = lng.split("-")[0];
      document.documentElement.dir = cleanLng === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = cleanLng;
    };

    i18n.on("languageChanged", handleLangChange);
    handleLangChange(i18n.language || "fr");

    return () => {
      i18n.off("languageChanged", handleLangChange);
    };
  }, [i18n]);

  return (
    <>
      <AppRouter />
      <InstallPrompt />
    </>
  );
};

export default App;
