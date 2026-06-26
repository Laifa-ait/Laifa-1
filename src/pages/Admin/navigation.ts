import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Wallet,
  PieChart,
  Megaphone,
  Settings,
  Database,
  LayoutGrid,
  AlertTriangle,
  MessageSquare,
  MessageSquareWarning,
  Star,
  ImageIcon,
  LayoutTemplate,
  FileText,
  Tag,
  BellRing,
  Bot,
  Languages,
  Rocket,
  Download
} from "lucide-react";

export const getNavGroups = (t: (key: string) => string) => [
  {
    title: t("admin.sidebar.group_dashboard") !== "admin.sidebar.group_dashboard" ? t("admin.sidebar.group_dashboard") : "Tableau de Bord",
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
        label: t("admin.sidebar.reports") !== "admin.sidebar.reports" ? t("admin.sidebar.reports") : "Exports & Rapports",
      },
    ],
  },
  {
    title: t("admin.sidebar.group_gestion") !== "admin.sidebar.group_gestion" ? t("admin.sidebar.group_gestion") : "Gestion Commerciale",
    items: [
      {
        to: "/dashboard/admin/orders",
        icon: LayoutGrid,
        label: t("admin.sidebar.orders") !== "admin.sidebar.orders" ? t("admin.sidebar.orders") : "Commandes & Achats",
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
        label: t("admin.sidebar.disputes") !== "admin.sidebar.disputes" ? t("admin.sidebar.disputes") : "Litiges & Retours",
      },
      {
        to: "/dashboard/admin/support",
        icon: MessageSquare,
        label: t("admin.sidebar.support") !== "admin.sidebar.support" ? t("admin.sidebar.support") : "Messages Support",
      },
      {
        to: "/dashboard/admin/reviews",
        icon: MessageSquareWarning,
        label: t("admin.sidebar.reviews") !== "admin.sidebar.reviews" ? t("admin.sidebar.reviews") : "Modération des Avis",
      },
    ],
  },
  {
    title: t("admin.sidebar.group_catalog") !== "admin.sidebar.group_catalog" ? t("admin.sidebar.group_catalog") : "Catalogue & Design",
    items: [
      {
        to: "/dashboard/admin/products-moderation",
        icon: ShieldAlert,
        label: t("admin.sidebar.product_moderation") !== "admin.sidebar.product_moderation" ? t("admin.sidebar.product_moderation") : "Modération Produits",
      },
      {
        to: "/dashboard/admin/curation",
        icon: Star,
        label: t("admin.sidebar.curation") !== "admin.sidebar.curation" ? t("admin.sidebar.curation") : "Curation Produits",
      },
      {
        to: "/dashboard/admin/categories",
        icon: LayoutGrid,
        label: t("admin.sidebar.categories") !== "admin.sidebar.categories" ? t("admin.sidebar.categories") : "Catégories",
      },
      {
        to: "/dashboard/admin/banners",
        icon: ImageIcon,
        label: t("admin.sidebar.banners") !== "admin.sidebar.banners" ? t("admin.sidebar.banners") : "Visuels & Bannières",
      },
      {
        to: "/dashboard/admin/homepage",
        icon: LayoutTemplate,
        label: t("admin.sidebar.homepage") !== "admin.sidebar.homepage" ? t("admin.sidebar.homepage") : "Homepage Builder",
      },
      {
        to: "/dashboard/admin/megamenu",
        icon: Settings,
        label: t("admin.sidebar.megamenu") !== "admin.sidebar.megamenu" ? t("admin.sidebar.megamenu") : "Mega Menu",
      },
      {
        to: "/dashboard/admin/search-index",
        icon: Database,
        label: t("admin.sidebar.search_index") !== "admin.sidebar.search_index" ? t("admin.sidebar.search_index") : "Indexation & Recherche",
      },
    ],
  },
  {
    title: t("admin.sidebar.group_marketing") !== "admin.sidebar.group_marketing" ? t("admin.sidebar.group_marketing") : "Marketing & Finances",
    items: [
      {
        to: "/dashboard/admin/finances",
        icon: Wallet,
        label: t("admin.sidebar.finances") !== "admin.sidebar.finances" ? t("admin.sidebar.finances") : "Finances & Payouts",
      },
      {
        to: "/dashboard/admin/shipping",
        icon: FileText,
        label: t("admin.sidebar.shipping") !== "admin.sidebar.shipping" ? t("admin.sidebar.shipping") : "Tarifs Livraison",
      },
      {
        to: "/dashboard/admin/promotions",
        icon: Tag,
        label: t("admin.sidebar.promo") !== "admin.sidebar.promo" ? t("admin.sidebar.promo") : "Codes Promo",
      },
      {
        to: "/dashboard/admin/marketing",
        icon: PieChart,
        label: t("admin.sidebar.marketing") !== "admin.sidebar.marketing" ? t("admin.sidebar.marketing") : "Marketing",
      },
      {
        to: "/dashboard/admin/newsletter",
        icon: Megaphone,
        label: t("admin.sidebar.newsletter") !== "admin.sidebar.newsletter" ? t("admin.sidebar.newsletter") : "Newsletter 2.0",
      },
      {
        to: "/dashboard/admin/push-notifications",
        icon: BellRing,
        label: t("admin.sidebar.push") !== "admin.sidebar.push" ? t("admin.sidebar.push") : "Notifications Push",
      },
      {
        to: "/dashboard/admin/sponsorships",
        icon: Star,
        label: t("admin.sidebar.sponsorships") !== "admin.sidebar.sponsorships" ? t("admin.sidebar.sponsorships") : "Sponsoring",
      },
    ],
  },
  {
    title: t("admin.sidebar.group_system") !== "admin.sidebar.group_system" ? t("admin.sidebar.group_system") : "Configuration Système",
    items: [
      {
        to: "/dashboard/admin/agents",
        icon: Bot,
        label: t("admin.sidebar.agents") !== "admin.sidebar.agents" ? t("admin.sidebar.agents") : "Agents IA",
      },
      {
        to: "/dashboard/admin/settings",
        icon: Settings,
        label: t("admin.sidebar.settings") !== "admin.sidebar.settings" ? t("admin.sidebar.settings") : "Paramètres Généraux",
      },
      {
        to: "/dashboard/admin/audit-logs",
        icon: ShieldAlert,
        label: t("admin.sidebar.audit") !== "admin.sidebar.audit" ? t("admin.sidebar.audit") : "Audit & Sécurité",
      },
      {
        to: "/dashboard/admin/translations",
        icon: Languages,
        label: t("admin.sidebar.translations") !== "admin.sidebar.translations" ? t("admin.sidebar.translations") : "Audit & Traductions",
      },
      {
        to: "/dashboard/admin/site-errors",
        icon: AlertTriangle,
        label: t("admin.sidebar.errors") !== "admin.sidebar.errors" ? t("admin.sidebar.errors") : "Exceptions & Erreurs",
      },
      {
        to: "/dashboard/admin/seed",
        icon: Database,
        label: t("admin.sidebar.seed") !== "admin.sidebar.seed" ? t("admin.sidebar.seed") : "Base Démo (Seed)",
      },
      {
        to: "/dashboard/admin/launch-checklist",
        icon: Rocket,
        label: t("admin.sidebar.launch") !== "admin.sidebar.launch" ? t("admin.sidebar.launch") : "Checklist de Lancement",
      },
    ],
  },
];
