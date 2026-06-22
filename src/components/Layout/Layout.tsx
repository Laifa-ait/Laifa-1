import React, { ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "react-router-dom";
import { Navbar } from "../Navbar";
import { Footer } from "../Footer";
import { MobileBottomNav } from "../MobileBottomNav";
import { CartDrawer } from "../Cart/CartDrawer";
import { WishlistDrawer } from "../Wishlist/WishlistDrawer";
import { MobileMenu } from "./MobileMenu";
import { useUI } from "../../context/UIContext";
import { FloatingActionBar } from "./FloatingActionBar";
import { SearchOverlay } from "../Search/SearchOverlay";
import { RecentlyViewedDrawer } from "../RecentlyViewed/RecentlyViewedDrawer";
import { useAuth } from "../../context/AuthContext";
import { AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { VerificationModal } from "../Auth/VerificationModal";

import { SupportFAB } from "../../routes/SupportFAB";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const { isCartOpen, setIsCartOpen, isWishlistOpen, setIsWishlistOpen, isMobileMenuOpen, setIsMobileMenuOpen } =
    useUI();
  const { currentUser, userProfile } = useAuth();
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<"email" | "sms">("email");

  const openVerification = async () => {
    try {
      const idToken = await currentUser?.getIdToken();
      const res = await fetch("/api/auth/2fa/send-code", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      setVerificationMethod(data.method || "email");
      setIsVerificationModalOpen(true);
    } catch (e) {
      console.error("Failed to start verification", e);
    }
  };

  const isDashboard =
    location.pathname.startsWith("/dashboard/admin") || location.pathname.startsWith("/dashboard/seller");
  const isAuthPage =
    location.pathname === "/auth" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/verify-email" ||
    location.pathname === "/onboarding";
  const isOrderDetails = location.pathname.includes("/order/");
  const isHomepage = location.pathname === "/";
  const isPremiumCollection = location.pathname.includes("/collection/");

  const isShop =
    location.pathname.startsWith("/shop") ||
    location.pathname.startsWith("/catalogue") ||
    location.pathname.startsWith("/ventes-flash") ||
    location.pathname.startsWith("/search");

  const hideNavigation = isDashboard || isAuthPage;

  if (hideNavigation) {
    return (
      <div
        className={`min-h-screen w-full font-sans selection:bg-[#EBE5DF] ${i18n.language === "ar" ? "rtl" : "ltr"} ${isAuthPage ? "bg-[#FAF8F5]" : ""}`}
        dir={i18n.language === "ar" ? "rtl" : "ltr"}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen overflow-x-clip w-full max-w-full bg-[#FAF8F5] text-[#121315] font-sans selection:bg-[#EBE5DF] pb-0 sm:pb-0 ${i18n.language === "ar" ? "rtl" : "ltr"}`}
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
    >
      {!isPremiumCollection && <Navbar />}

      <main className="min-h-[calc(100vh-200px)] relative">{children}</main>

      {isHomepage && <Footer isHomepage={isHomepage} />}

      {isHomepage && <MobileBottomNav />}

      <SupportFAB />
      <FloatingActionBar />

      <SearchOverlay />
      <RecentlyViewedDrawer />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <WishlistDrawer isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />
      <MobileMenu />
    </div>
  );
};
