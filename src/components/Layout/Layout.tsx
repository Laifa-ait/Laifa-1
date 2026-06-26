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
import { SearchOverlay } from "../Search/SearchOverlay";
import { RecentlyViewedDrawer } from "../RecentlyViewed/RecentlyViewedDrawer";
import { useAuth } from "../../context/AuthContext";
import { AlertCircle, ArrowRight, ShieldCheck, WifiOff } from "lucide-react";
import { VerificationModal } from "../Auth/VerificationModal";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const location = useLocation();
  const isOnline = useOnlineStatus();
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

  const isCheckoutPage = location.pathname === "/checkout";

  const isShop =
    location.pathname.startsWith("/shop") ||
    location.pathname.startsWith("/catalogue") ||
    location.pathname.startsWith("/ventes-flash") ||
    location.pathname.startsWith("/search");

  const hideNavigation = isDashboard || isAuthPage;

  if (hideNavigation) {
    return (
      <div
        className={`min-h-screen w-full font-sans selection:bg-slate-200 ${i18n.language === "ar" ? "rtl" : "ltr"} ${isAuthPage ? "bg-slate-50" : ""}`}
        dir={i18n.language === "ar" ? "rtl" : "ltr"}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen overflow-x-clip w-full max-w-full bg-slate-50 text-slate-900 font-sans selection:bg-slate-200 pb-0 sm:pb-0 ${i18n.language === "ar" ? "rtl" : "ltr"}`}
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
    >
      {!isPremiumCollection && !isCheckoutPage && <Navbar />}

      <main className="min-h-[calc(100vh-200px)] relative">{children}</main>

      {!isCheckoutPage && <Footer isHomepage={isHomepage} />}

      <MobileBottomNav />

      {!isOnline && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full z-50 flex items-center gap-2 shadow-lg">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Mode hors ligne</span>
        </div>
      )}

      <SearchOverlay />
      <RecentlyViewedDrawer />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
      <WishlistDrawer isOpen={isWishlistOpen} onClose={() => setIsWishlistOpen(false)} />
      <MobileMenu />
    </div>
  );
};
