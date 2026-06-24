import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Wallet,
  PieChart,
  Megaphone,
  Settings,
  Database,
  LogOut,
  Menu,
  X,
  Home,
  ImageIcon,
  MessageSquare,
  LayoutTemplate,
  Tag,
  AlertTriangle,
  Monitor,
  FileText,
  Languages,
  Star,
  LayoutGrid,
  Bot,
  Download,
  MessageSquareWarning,
  BellRing,
  Rocket,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { auth } from "../../lib/firebase";
import { AdminInternalNotifications } from "../../components/Admin/AdminInternalNotifications";
export const AdminDashboardLayout: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/auth", { replace: true });
  };

  const navGroups = [
    {
      title:
        t("admin.sidebar.group_dashboard") !== "admin.sidebar.group_dashboard"
          ? t("admin.sidebar.group_dashboard")
          : "Tableau de Bord",
      items: [
        {
          to: "/dashboard/admin",
          icon: LayoutDashboard,
          label: t("admin_analytics") !== "admin_analytics" ? t("admin_analytics") : "Analytics",
          end: true,
        },
        {
          to: "/dashboard/admin/reports",
          icon: Download,
          label:
            t("admin.sidebar.reports") !== "admin.sidebar.reports" ? t("admin.sidebar.reports") : "Exports & Rapports",
        },
      ],
    },
    {
      title:
        t("admin.sidebar.group_gestion") !== "admin.sidebar.group_gestion"
          ? t("admin.sidebar.group_gestion")
          : "Gestion Commerciale",
      items: [
        {
          to: "/dashboard/admin/orders",
          icon: LayoutGrid,
          label:
            t("admin.sidebar.orders") !== "admin.sidebar.orders" ? t("admin.sidebar.orders") : "Commandes & Achats",
        },
        {
          to: "/dashboard/admin/users",
          icon: Users,
          label: t("admin.sidebar.vip") !== "admin.sidebar.vip" ? t("admin.sidebar.vip") : "Clients VIP",
        },
        {
          to: "/dashboard/admin/sellers",
          icon: Users,
          label: t("admin.sidebar.sellers") !== "admin.sidebar.sellers" ? t("admin.sidebar.sellers") : "Vendeurs",
        },
        {
          to: "/dashboard/admin/disputes",
          icon: AlertTriangle,
          label:
            t("admin.sidebar.disputes") !== "admin.sidebar.disputes"
              ? t("admin.sidebar.disputes")
              : "Litiges & Retours",
        },
        {
          to: "/dashboard/admin/support",
          icon: MessageSquare,
          label:
            t("admin.sidebar.support") !== "admin.sidebar.support" ? t("admin.sidebar.support") : "Messages Support",
        },
        {
          to: "/dashboard/admin/reviews",
          icon: MessageSquareWarning,
          label:
            t("admin.sidebar.reviews") !== "admin.sidebar.reviews" ? t("admin.sidebar.reviews") : "Modération des Avis",
        },
      ],
    },
    {
      title:
        t("admin.sidebar.group_catalog") !== "admin.sidebar.group_catalog"
          ? t("admin.sidebar.group_catalog")
          : "Catalogue & Design",
      items: [
        {
          to: "/dashboard/admin/products-moderation",
          icon: ShieldAlert,
          label:
            t("admin.sidebar.product_moderation") !== "admin.sidebar.product_moderation"
              ? t("admin.sidebar.product_moderation")
              : "Modération Produits",
        },
        {
          to: "/dashboard/admin/curation",
          icon: Star,
          label:
            t("admin.sidebar.curation") !== "admin.sidebar.curation"
              ? t("admin.sidebar.curation")
              : "Curation Produits",
        },
        {
          to: "/dashboard/admin/categories",
          icon: LayoutGrid,
          label:
            t("admin.sidebar.categories") !== "admin.sidebar.categories" ? t("admin.sidebar.categories") : "Catégories",
        },
        {
          to: "/dashboard/admin/banners",
          icon: ImageIcon,
          label:
            t("admin.sidebar.banners") !== "admin.sidebar.banners" ? t("admin.sidebar.banners") : "Visuels & Bannières",
        },
        {
          to: "/dashboard/admin/homepage",
          icon: LayoutTemplate,
          label:
            t("admin.sidebar.homepage") !== "admin.sidebar.homepage" ? t("admin.sidebar.homepage") : "Homepage Builder",
        },
        {
          to: "/dashboard/admin/megamenu",
          icon: Settings,
          label: t("admin.sidebar.megamenu") !== "admin.sidebar.megamenu" ? t("admin.sidebar.megamenu") : "Mega Menu",
        },
        {
          to: "/dashboard/admin/search-index",
          icon: Database,
          label:
            t("admin.sidebar.search_index") !== "admin.sidebar.search_index"
              ? t("admin.sidebar.search_index")
              : "Indexation & Recherche",
        },
      ],
    },
    {
      title:
        t("admin.sidebar.group_marketing") !== "admin.sidebar.group_marketing"
          ? t("admin.sidebar.group_marketing")
          : "Marketing & Finances",
      items: [
        {
          to: "/dashboard/admin/finances",
          icon: Wallet,
          label:
            t("admin.sidebar.finances") !== "admin.sidebar.finances"
              ? t("admin.sidebar.finances")
              : "Finances & Payouts",
        },
        {
          to: "/dashboard/admin/shipping",
          icon: FileText,
          label:
            t("admin.sidebar.shipping") !== "admin.sidebar.shipping" ? t("admin.sidebar.shipping") : "Tarifs Livraison",
        },
        {
          to: "/dashboard/admin/promotions",
          icon: Tag,
          label: t("admin.sidebar.promo") !== "admin.sidebar.promo" ? t("admin.sidebar.promo") : "Codes Promo",
        },
        {
          to: "/dashboard/admin/marketing",
          icon: PieChart,
          label:
            t("admin.sidebar.marketing") !== "admin.sidebar.marketing" ? t("admin.sidebar.marketing") : "Marketing",
        },
        {
          to: "/dashboard/admin/newsletter",
          icon: Megaphone,
          label:
            t("admin.sidebar.newsletter") !== "admin.sidebar.newsletter"
              ? t("admin.sidebar.newsletter")
              : "Newsletter 2.0",
        },
        {
          to: "/dashboard/admin/push-notifications",
          icon: BellRing,
          label: t("admin.sidebar.push") !== "admin.sidebar.push" ? t("admin.sidebar.push") : "Notifications Push",
        },
        {
          to: "/dashboard/admin/sponsorships",
          icon: Star,
          label:
            t("admin.sidebar.sponsorships") !== "admin.sidebar.sponsorships"
              ? t("admin.sidebar.sponsorships")
              : "Sponsoring",
        },
      ],
    },
    {
      title:
        t("admin.sidebar.group_system") !== "admin.sidebar.group_system"
          ? t("admin.sidebar.group_system")
          : "Configuration Système",
      items: [
        {
          to: "/dashboard/admin/agents",
          icon: Bot,
          label: t("admin.sidebar.agents") !== "admin.sidebar.agents" ? t("admin.sidebar.agents") : "Agents IA",
        },
        {
          to: "/dashboard/admin/settings",
          icon: Settings,
          label:
            t("admin.sidebar.settings") !== "admin.sidebar.settings"
              ? t("admin.sidebar.settings")
              : "Paramètres Généraux",
        },
        {
          to: "/dashboard/admin/audit-logs",
          icon: ShieldAlert,
          label: t("admin.sidebar.audit") !== "admin.sidebar.audit" ? t("admin.sidebar.audit") : "Audit & Sécurité",
        },
        {
          to: "/dashboard/admin/translations",
          icon: Languages,
          label:
            t("admin.sidebar.translations") !== "admin.sidebar.translations"
              ? t("admin.sidebar.translations")
              : "Audit & Traductions",
        },
        {
          to: "/dashboard/admin/site-errors",
          icon: AlertTriangle,
          label:
            t("admin.sidebar.errors") !== "admin.sidebar.errors" ? t("admin.sidebar.errors") : "Exceptions & Erreurs",
        },
        {
          to: "/dashboard/admin/seed",
          icon: Database,
          label: t("admin.sidebar.seed") !== "admin.sidebar.seed" ? t("admin.sidebar.seed") : "Base Démo (Seed)",
        },
        {
          to: "/dashboard/admin/launch-checklist",
          icon: Rocket,
          label:
            t("admin.sidebar.launch") !== "admin.sidebar.launch" ? t("admin.sidebar.launch") : "Checklist de Lancement",
        },
      ],
    },
  ];

  const renderNavItems = (onClick?: () => void) => (
    <div className="space-y-6">
      {navGroups.map((group, idx) => (
        <div key={idx}>
          <h4 className="px-5 mb-3 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal text-zinc-500 rtl:tracking-normal">
            {group.title}
          </h4>
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClick}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-3 rounded-xl text-[11px] uppercase tracking-widest rtl:tracking-normal font-bold transition-all ${
                    isActive
                      ? "bg-[#ea580c] text-white shadow-lg shadow-orange-500/20"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafaf9] flex flex-col lg:flex-row">
      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between w-full h-16 px-6 bg-white text-zinc-950 border-b border-zinc-200 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors bg-transparent border-none cursor-pointer"
            id="admin-mobile-menu-open"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#ea580c] flex items-center justify-center text-white">
              <Database className="w-4 h-4" />
            </div>
            <span className="text-sm font-kinder tracking-tighter rtl:tracking-normal uppercase">{t("OLMA ADMIN")}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <AdminInternalNotifications />
          <button
            type="button"
            onClick={() => navigate("/")}
            className="p-2 text-zinc-500 hover:text-zinc-950 transition-colors bg-transparent border-none text-xs font-bold uppercase tracking-wider rtl:tracking-normal flex items-center gap-1.5 cursor-pointer"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer (AnimatePresence) */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              className="fixed inset-0 bg-black/60 z-50 lg:hidden"
            />
            {/* Sidebar drawer content */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed start-0 top-0 bottom-0 w-[280px] sm:w-[320px] bg-white z-[60] flex flex-col text-zinc-950 lg:hidden shadow-2xl"
            >
              <div className="p-6 border-b border-zinc-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ea580c] flex items-center justify-center text-white">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-base font-kinder tracking-tighter rtl:tracking-normal text-zinc-950">
                      {t("OLMA ADMIN")}
                    </h1>
                    <p className="text-[9px] font-kinder text-zinc-500 uppercase tracking-widest rtl:tracking-normal leading-none">
                      {t("Core Control")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-1 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-950 transition-all bg-transparent border-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {renderNavItems(() => setIsMobileNavOpen(false))}
              </nav>

              <div className="p-6 border-t border-zinc-200 space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileNavOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-4 px-5 py-3 rounded-xl text-[11px] uppercase tracking-widest rtl:tracking-normal font-bold text-red-500 hover:bg-red-50 transition-all bg-transparent border-none cursor-pointer text-start"
                >
                  <LogOut className="w-4.5 h-4.5" />
                  {t("Déconnexion")}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="w-80 bg-white border-r border-zinc-200 sticky top-0 h-screen hidden lg:flex flex-col text-zinc-950 shrink-0">
        <div className="p-10 border-b border-zinc-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#ea580c] flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-kinder tracking-tighter rtl:tracking-normal text-zinc-950">
                {t("OLMA ADMIN")}
              </h1>
              <p className="text-[10px] font-kinder text-zinc-500 uppercase tracking-widest rtl:tracking-normal leading-none">
                {t("Core Control")}
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-3 overflow-y-auto">{renderNavItems()}</nav>

        <div className="p-8 border-t border-zinc-200 space-y-4">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] uppercase tracking-widest rtl:tracking-normal font-bold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 transition-all bg-transparent border-none cursor-pointer text-start"
          >
            <Home className="w-5 h-5" />
            {t("Retour")}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] uppercase tracking-widest rtl:tracking-normal font-bold text-red-500 hover:bg-red-50 transition-all bg-transparent border-none cursor-pointer text-start"
          >
            <LogOut className="w-5 h-5" />
            {t("Déconnexion")}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#fafaf9]">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-20 bg-white border-b border-zinc-200 px-10 items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-kinder uppercase tracking-[0.2em] text-zinc-400">
              {t("Système Live • Algérie")}
            </span>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 bg-zinc-100 rounded-full px-4 py-2 border border-zinc-200">
              <Monitor className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px] font-kinder text-zinc-600 uppercase tracking-widest rtl:tracking-normal">
                {auth.currentUser?.email}
              </span>
            </div>

            <div className="w-px h-6 bg-zinc-200" />

            <div className="bg-zinc-950 px-2 py-1.5 rounded-xl shadow-lg border border-white/10">
              <AdminInternalNotifications />
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-8 md:p-12 lg:p-16">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
