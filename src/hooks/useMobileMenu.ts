import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { useUIStore } from "../store/useUIStore";
import { useShop } from "../context/ShopContext";
import { useNavigate } from "react-router-dom";

export const useMobileMenu = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { currentUser, logout, userProfile } = useAuth();
  const isMobileMenuOpen = useUIStore((state) => state.isMobileMenuOpen);
  const setIsMobileMenuOpen = useUIStore((state) => state.setIsMobileMenuOpen);
  const setIsWishlistOpen = useUIStore((state) => state.setIsWishlistOpen);
  const { setActiveCategory } = useShop();

  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [aboutText, setAboutText] = useState("");
  const [isLoadingAbout, setIsLoadingAbout] = useState(false);

  const closeMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, [setIsMobileMenuOpen]);

  const handleNav = useCallback(
    (path: string) => {
      if (path === "#wishlist") {
        setIsWishlistOpen(true);
        closeMenu();
        return;
      }
      navigate(path);
      closeMenu();
    },
    [navigate, setIsWishlistOpen, closeMenu]
  );

  const handleLanguageToggle = useCallback(() => {
    const langs = ["fr", "ar", "en"];
    let currentLang = i18n.language || "fr";
    if (currentLang && typeof currentLang === "string" && currentLang.includes("-"))
      currentLang = currentLang.split("-")[0];

    const safeLangs = Array.isArray(langs) ? langs : ["fr", "ar", "en"];
    const currentIndex = safeLangs.indexOf(currentLang) >= 0 ? safeLangs.indexOf(currentLang) : 0;
    const nextLang = safeLangs[(currentIndex + 1) % safeLangs.length];
    i18n.changeLanguage(nextLang);
  }, [i18n]);

  const fetchAboutText = useCallback(async () => {
    setIsAboutOpen(true);
    if (aboutText) return;
    setIsLoadingAbout(true);
    try {
      const docSnap = await getDoc(doc(db, "settings", "global"));
      setAboutText(
        docSnap.exists() && docSnap.data().aboutText ? docSnap.data().aboutText : "Bienvenue sur Olma Marketplace."
      );
    } catch {
      setAboutText("Bienvenue sur Olma Marketplace.");
    } finally {
      setIsLoadingAbout(false);
    }
  }, [aboutText]);

  return {
    currentUser,
    userProfile,
    isMobileMenuOpen,
    isAboutOpen,
    setIsAboutOpen,
    aboutText,
    isLoadingAbout,
    fetchAboutText,
    closeMenu,
    handleNav,
    handleLanguageToggle,
    logout,
  };
};
