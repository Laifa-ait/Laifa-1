import React from "react";
import { Home, Heart, ShoppingBag, User as UserIcon, LayoutGrid } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useUI } from "../context/UIContext";

export const MobileBottomNav: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const { cart, wishlist } = useCart();
  const { setIsCartOpen, setIsWishlistOpen } = useUI();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Show bottom navigation bar ONLY on the homepage
  if (location.pathname !== "/") {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-slate-100 z-50 shadow-[0_-8px_32px_rgba(0,0,0,0.04)] overflow-hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-[4.5rem] w-full px-2">
        {/* Home */}
        <button
          onClick={() => navigate("/")}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-[0.92] transition-all bg-transparent border-none cursor-pointer relative"
        >
          {isActive("/") && <div className="absolute inset-0 bg-sky-50 rounded-2xl -z-10" />}
          <Home
            className={`w-6 h-6 transition-colors ${isActive("/") ? "text-sky-500" : "text-slate-400"}`}
            strokeWidth={isActive("/") ? 2.5 : 2}
          />
        </button>

        {/* Categories */}
        <button
          onClick={() => navigate("/categories")}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-[0.92] transition-all bg-transparent border-none cursor-pointer relative"
        >
          {isActive("/categories") && <div className="absolute inset-0 bg-sky-50 rounded-2xl -z-10" />}
          <LayoutGrid
            className={`w-6 h-6 transition-colors ${isActive("/categories") ? "text-sky-500" : "text-slate-400"}`}
            strokeWidth={isActive("/categories") ? 2.5 : 2}
          />
        </button>

        {/* Wishlist */}
        <button
          onClick={() => setIsWishlistOpen(true)}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-[0.92] transition-all relative bg-transparent border-none cursor-pointer"
        >
          <Heart
            className={`w-6 h-6 transition-colors ${wishlist.length > 0 ? "text-pink-500 fill-pink-500/20" : "text-slate-400"}`}
            strokeWidth={wishlist.length > 0 ? 2.5 : 2}
          />
          {wishlist.length > 0 && (
            <span className="absolute top-2 right-3 w-2 h-2 bg-pink-500 border-2 border-white rounded-full shadow-sm" />
          )}
        </button>

        {/* Cart */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-[0.92] transition-all relative bg-transparent border-none cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag
              className={`w-6 h-6 transition-colors ${cart.length > 0 ? "text-sky-500" : "text-slate-400"}`}
              strokeWidth={cart.length > 0 ? 2.5 : 2}
            />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-2 w-4.5 h-4.5 bg-sky-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold border-[1.5px] border-white shadow-sm">
                {cart.length}
              </span>
            )}
          </div>
        </button>

        {/* Account / Dashboard */}
        <button
          onClick={() => {
            if (!currentUser) {
              navigate("/auth", { replace: true });
              return;
            }
            if (userProfile?.role === "admin") {
              navigate("/dashboard/admin");
            } else if (userProfile?.role === "seller") {
              navigate("/dashboard/seller");
            } else {
              navigate("/dashboard/buyer");
            }
          }}
          className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl active:scale-[0.92] transition-all bg-transparent border-none cursor-pointer relative"
        >
          {location.pathname.startsWith("/dashboard") && (
            <div className="absolute inset-0 bg-sky-50 rounded-2xl -z-10" />
          )}
          <UserIcon
            className={`w-6 h-6 transition-colors ${location.pathname.startsWith("/dashboard") ? "text-sky-500" : "text-slate-400"}`}
            strokeWidth={location.pathname.startsWith("/dashboard") ? 2.5 : 2}
          />
        </button>
      </div>
    </div>
  );
};
