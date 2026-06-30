import React, { Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";

import { PageLoader } from "./components/ui/PageLoader";

// Public Pages (Lazy Loaded)
const Home = React.lazy(() => import("./pages/Public/Home").then((m) => ({ default: m.Home })));
const Shop = React.lazy(() => import("./pages/Public/Shop").then((m) => ({ default: m.Shop })));
const ProductDetails = React.lazy(() =>
  import("./pages/Public/ProductDetails").then((m) => ({
    default: m.ProductDetails,
  }))
);
const Auth = React.lazy(() => import("./pages/Public/Auth").then((m) => ({ default: m.Auth })));
const Cart = React.lazy(() => import("./pages/Public/Cart").then((m) => ({ default: m.Cart })));
const Checkout = React.lazy(() => import("./pages/Public/Checkout").then((m) => ({ default: m.Checkout })));
const BuyerDashboard = React.lazy(() => import("./pages/BuyerDashboard").then((m) => ({ default: m.BuyerDashboard })));
const PrivacyPolicy = React.lazy(() =>
  import("./pages/Public/PrivacyPolicy").then((m) => ({ default: m.PrivacyPolicy }))
);
const RefundPolicy = React.lazy(() => import("./pages/Public/RefundPolicy").then((m) => ({ default: m.RefundPolicy })));
const Support = React.lazy(() => import("./pages/Public/Support").then((m) => ({ default: m.Support })));
const MobileCategories = React.lazy(() => import("./components/MobileCategories"));

// Modular Dashboards
const SellerDashboardLayout = React.lazy(() =>
  import("./pages/Seller/SellerDashboardLayout").then((module) => ({
    default: module.SellerDashboardLayout,
  }))
);
const SellerOverview = React.lazy(() =>
  import("./pages/Seller/Overview").then((module) => ({
    default: module.Overview,
  }))
);
const Catalog = React.lazy(() =>
  import("./pages/Seller/Catalog").then((module) => ({
    default: module.Catalog,
  }))
);
const SellerOrders = React.lazy(() =>
  import("./pages/Seller/Orders").then((module) => ({
    default: module.Orders,
  }))
);
const ReturnManagement = React.lazy(() =>
  import("./pages/Seller/ReturnManagement").then((module) => ({
    default: module.ReturnManagement,
  }))
);
const Wallet = React.lazy(() =>
  import("./pages/Seller/Wallet").then((module) => ({
    default: module.Wallet,
  }))
);
const Verification = React.lazy(() =>
  import("./pages/Seller/Verification").then((module) => ({
    default: module.Verification,
  }))
);
const ShopSettings = React.lazy(() =>
  import("./pages/Seller/ShopSettings").then((module) => ({
    default: module.ShopSettings,
  }))
);
const SellerSupport = React.lazy(() =>
  import("./pages/Seller/Support").then((module) => ({
    default: module.Support,
  }))
);
const SellerReviews = React.lazy(() =>
  import("./pages/Seller/Reviews").then((module) => ({
    default: module.SellerReviews,
  }))
);
const SellerSponsorships = React.lazy(() =>
  import("./pages/Seller/Sponsorships").then((module) => ({
    default: module.SellerSponsorships,
  }))
);

const AdminDashboardLayout = React.lazy(() =>
  import("./pages/Admin/AdminDashboardLayout").then((module) => ({
    default: module.AdminDashboardLayout,
  }))
);
const AdminOverview = React.lazy(() =>
  import("./pages/Admin/Overview").then((module) => ({
    default: module.Overview,
  }))
);
const SellerModeration = React.lazy(() =>
  import("./pages/Admin/SellerModeration").then((module) => ({
    default: module.SellerModeration,
  }))
);
const ProductModeration = React.lazy(() =>
  import("./pages/Admin/ProductModeration").then((module) => ({
    default: module.ProductModeration,
  }))
);
const Curation = React.lazy(() =>
  import("./pages/Admin/Curation").then((module) => ({
    default: module.Curation,
  }))
);
const SponsorshipsAdmin = React.lazy(() =>
  import("./pages/Admin/SponsorshipsAdmin").then((module) => ({
    default: module.SponsorshipsAdmin,
  }))
);
const Finances = React.lazy(() =>
  import("./pages/Admin/Finances").then((module) => ({
    default: module.Finances,
  }))
);
const DBSeedAdmin = React.lazy(() =>
  import("./pages/Admin/DBSeedAdmin").then((module) => ({
    default: module.DBSeedAdmin,
  }))
);
const Marketing = React.lazy(() =>
  import("./pages/Admin/Marketing").then((module) => ({
    default: module.Marketing,
  }))
);
const Newsletter = React.lazy(() =>
  import("./pages/Admin/Newsletter").then((module) => ({
    default: module.Newsletter,
  }))
);
const MegaMenuSettings = React.lazy(() =>
  import("./pages/Admin/MegaMenuSettings").then((module) => ({
    default: module.MegaMenuSettings,
  }))
);
const BannerAdmin = React.lazy(() =>
  import("./pages/Admin/BannerAdmin").then((module) => ({
    default: module.BannerAdmin,
  }))
);
const HomepageBuilder = React.lazy(() =>
  import("./pages/Admin/HomepageBuilder").then((module) => ({
    default: module.HomepageBuilder,
  }))
);
const SupportAdmin = React.lazy(() =>
  import("./pages/Admin/Support").then((module) => ({
    default: module.SupportAdmin,
  }))
);
const DisputeManagement = React.lazy(() =>
  import("./pages/Admin/DisputeManagement").then((module) => ({
    default: module.DisputeManagement,
  }))
);
const LaunchChecklistAdmin = React.lazy(() =>
  import("./pages/Admin/LaunchChecklistAdmin").then((module) => ({
    default: module.LaunchChecklistAdmin,
  }))
);
const SearchIndexAdmin = React.lazy(() =>
  import("./pages/Admin/SearchIndexAdmin").then((module) => ({
    default: module.SearchIndexAdmin,
  }))
);
const CategoriesAdmin = React.lazy(() =>
  import("./pages/Admin/CategoriesAdmin").then((module) => ({
    default: module.CategoriesAdmin,
  }))
);
const SettingsAdmin = React.lazy(() =>
  import("./pages/Admin/SettingsAdmin").then((module) => ({
    default: module.SettingsAdmin,
  }))
);
const UsersAdmin = React.lazy(() =>
  import("./pages/Admin/UsersAdmin").then((module) => ({
    default: module.UsersAdmin,
  }))
);
const AuditLogsAdmin = React.lazy(() =>
  import("./pages/Admin/AuditLogsAdmin").then((module) => ({
    default: module.AuditLogsAdmin,
  }))
);
const TranslationAdmin = React.lazy(() =>
  import("./pages/Admin/TranslationAdmin").then((module) => ({
    default: module.TranslationAdmin,
  }))
);
const AgentsAdmin = React.lazy(() =>
  import("./pages/Admin/AgentsAdmin").then((module) => ({
    default: module.AgentsAdmin,
  }))
);
const SiteErrorsAdmin = React.lazy(() =>
  import("./pages/Admin/SiteErrorsAdmin").then((module) => ({
    default: module.SiteErrorsAdmin,
  }))
);
const OrdersAdmin = React.lazy(() =>
  import("./pages/Admin/OrdersAdmin").then((module) => ({
    default: module.OrdersAdmin,
  }))
);
const ShippingAdmin = React.lazy(() =>
  import("./pages/Admin/ShippingAdmin").then((module) => ({
    default: module.ShippingAdmin,
  }))
);
const PromotionsAdmin = React.lazy(() =>
  import("./pages/Admin/PromotionsAdmin").then((module) => ({ default: module.PromotionsAdmin }))
);
const ReviewsAdmin = React.lazy(() =>
  import("./pages/Admin/ReviewsAdmin").then((module) => ({ default: module.ReviewsAdmin }))
);
const PushNotificationsAdmin = React.lazy(() =>
  import("./pages/Admin/PushNotificationsAdmin").then((module) => ({ default: module.PushNotificationsAdmin }))
);
const ReportsAdmin = React.lazy(() =>
  import("./pages/Admin/ReportsAdmin").then((module) => ({ default: module.ReportsAdmin }))
);

const StoreProfile = React.lazy(() =>
  import("./pages/Public/StoreProfile").then((module) => ({
    default: module.StoreProfile,
  }))
);

const ProductFilterPage = React.lazy(() =>
  import("./pages/Public/ProductFilterPage").then((m) => ({
    default: m.ProductFilterPage,
  }))
);
const CampaignCollection = React.lazy(() =>
  import("./pages/Public/CampaignCollection").then((m) => ({
    default: m.CampaignCollection,
  }))
);
const CampaignPage = React.lazy(() =>
  import("./pages/Public/CampaignPage").then((m) => ({
    default: m.CampaignPage,
  }))
);
const TagCollectionPage = React.lazy(() =>
  import("./pages/Public/TagCollectionPage").then((m) => ({
    default: m.TagCollectionPage,
  }))
);
const FlashSalesPage = React.lazy(() =>
  import("./pages/Public/FlashSalesPage").then((m) => ({
    default: m.FlashSalesPage,
  }))
);
const PremiumCollection = React.lazy(() =>
  import("./pages/Public/PremiumCollection").then((m) => ({
    default: m.PremiumCollection,
  }))
);
const DynamicCollectionPage = React.lazy(() =>
  import("./pages/Public/DynamicCollectionPage").then((m) => ({
    default: m.DynamicCollectionPage,
  }))
);
const FeaturedProducts = React.lazy(() =>
  import("./pages/Public/FeaturedProducts").then((m) => ({
    default: m.FeaturedProducts,
  }))
);
const ShippingCalculatorPage = React.lazy(() =>
  import("./pages/Public/ShippingCalculatorPage").then((m) => ({
    default: m.ShippingCalculatorPage,
  }))
);
const DeliveryTracking = React.lazy(() =>
  import("./pages/Public/DeliveryTracking").then((m) => ({
    default: m.DeliveryTracking,
  }))
);
const OrderDetails = React.lazy(() =>
  import("./pages/Public/OrderDetails").then((m) => ({
    default: m.OrderDetails,
  }))
);
const VerifyEmail = React.lazy(() =>
  import("./pages/Public/VerifyEmail").then((m) => ({
    default: m.VerifyEmail,
  }))
);
const Onboarding = React.lazy(() => import("./pages/Public/Onboarding").then((m) => ({ default: m.Onboarding })));
const ForgotPassword = React.lazy(() =>
  import("./pages/Public/ForgotPassword").then((m) => ({
    default: m.ForgotPassword,
  }))
);
const NotFound = React.lazy(() =>
  import("./pages/Public/NotFound").then((m) => ({
    default: m.NotFound,
  }))
);

import { Layout } from "./components/Layout/Layout";
import { AppGuard } from "./components/AppGuard";
import { ROLES } from "./constants/roles";

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith("/dashboard");

  if (isDashboard) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

export const AppRouter: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            {/* PUBLIC ROUTES BUT SUBJECT TO GLOBAL GUARD IF LOGGED IN */}
            <Route element={<AppGuard requireAuth={false} />}>
              <Route
                path="/"
                element={
                  <PageWrapper>
                    <Home />
                  </PageWrapper>
                }
              />
              <Route
                path="/shop"
                element={
                  <PageWrapper>
                    <Shop />
                  </PageWrapper>
                }
              />
              <Route
                path="/store/:sellerId"
                element={
                  <PageWrapper>
                    <StoreProfile />
                  </PageWrapper>
                }
              />
              <Route
                path="/catalogue/:tagSlug"
                element={
                  <PageWrapper>
                    <ProductFilterPage />
                  </PageWrapper>
                }
              />
              <Route
                path="/ventes-flash"
                element={
                  <PageWrapper>
                    <FlashSalesPage />
                  </PageWrapper>
                }
              />
              <Route
                path="/premium-collection"
                element={
                  <PageWrapper>
                    <PremiumCollection />
                  </PageWrapper>
                }
              />
              <Route
                path="/collection/:collectionName"
                element={
                  <PageWrapper>
                    <DynamicCollectionPage />
                  </PageWrapper>
                }
              />
              <Route
                path="/featured"
                element={
                  <PageWrapper>
                    <FeaturedProducts />
                  </PageWrapper>
                }
              />
              <Route
                path="/campaign-collection/:bannerId"
                element={
                  <PageWrapper>
                    <CampaignCollection />
                  </PageWrapper>
                }
              />
              <Route
                path="/campaign/:bannerId"
                element={
                  <PageWrapper>
                    <CampaignPage />
                  </PageWrapper>
                }
              />
              <Route
                path="/tags/:tagId"
                element={
                  <PageWrapper>
                    <TagCollectionPage />
                  </PageWrapper>
                }
              />
              <Route
                path="/product/:id"
                element={
                  <PageWrapper>
                    <ProductDetails />
                  </PageWrapper>
                }
              />
              <Route
                path="/auth"
                element={
                  <PageWrapper>
                    <Auth />
                  </PageWrapper>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PageWrapper>
                    <ForgotPassword />
                  </PageWrapper>
                }
              />
              <Route
                path="/cart"
                element={
                  <PageWrapper>
                    <Cart />
                  </PageWrapper>
                }
              />
              <Route
                path="/privacy-policy"
                element={
                  <PageWrapper>
                    <PrivacyPolicy />
                  </PageWrapper>
                }
              />
              <Route
                path="/refund-policy"
                element={
                  <PageWrapper>
                    <RefundPolicy />
                  </PageWrapper>
                }
              />
              <Route
                path="/support"
                element={
                  <PageWrapper>
                    <Support />
                  </PageWrapper>
                }
              />
              <Route
                path="/categories"
                element={
                  <PageWrapper>
                    <MobileCategories />
                  </PageWrapper>
                }
              />
              <Route
                path="/shipping-calculator"
                element={
                  <PageWrapper>
                    <ShippingCalculatorPage />
                  </PageWrapper>
                }
              />
              <Route
                path="/delivery-tracking"
                element={
                  <PageWrapper>
                    <DeliveryTracking />
                  </PageWrapper>
                }
              />
              <Route path="/search" element={<Navigate to="/shop" replace />} />

              <Route
                path="/verify-email"
                element={
                  <PageWrapper>
                    <VerifyEmail />
                  </PageWrapper>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <PageWrapper>
                    <Onboarding />
                  </PageWrapper>
                }
              />
            </Route>

            {/* PROTECTED ROUTES */}
            <Route element={<AppGuard requireAuth={true} />}>
              <Route
                path="/checkout"
                element={
                  <PageWrapper>
                    <Checkout />
                  </PageWrapper>
                }
              />

              <Route
                path="/dashboard/buyer"
                element={
                  <AppGuard allowedRoles={[ROLES.BUYER, ROLES.ADMIN, ROLES.SELLER]}>
                    <BuyerDashboard />
                  </AppGuard>
                }
              />
              <Route
                path="/dashboard/buyer/order/:id"
                element={
                  <AppGuard allowedRoles={[ROLES.BUYER, ROLES.ADMIN, ROLES.SELLER]}>
                    <OrderDetails />
                  </AppGuard>
                }
              />

              {/* Seller Dashboard (Modular) */}
              <Route
                path="/dashboard/seller"
                element={
                  <AppGuard allowedRoles={[ROLES.SELLER, ROLES.ADMIN]}>
                    <SellerDashboardLayout />
                  </AppGuard>
                }
              >
                <Route index element={<SellerOverview />} />
                <Route path="catalog" element={<Catalog />} />
                <Route path="orders" element={<SellerOrders />} />
                <Route path="returns" element={<ReturnManagement />} />
                <Route path="wallet" element={<Wallet />} />
                <Route path="verification" element={<Verification />} />
                <Route path="settings" element={<ShopSettings />} />
                <Route path="support" element={<SellerSupport />} />
                <Route path="reviews" element={<SellerReviews />} />
                <Route path="sponsorships" element={<SellerSponsorships />} />
              </Route>

              {/* Admin Dashboard (Modular) */}
              <Route
                path="/dashboard/admin"
                element={
                  <AppGuard allowedRoles={[ROLES.ADMIN]}>
                    <AdminDashboardLayout />
                  </AppGuard>
                }
              >
                <Route index element={<AdminOverview />} />
                <Route path="orders" element={<OrdersAdmin />} />
                <Route path="shipping" element={<ShippingAdmin />} />
                <Route path="promotions" element={<PromotionsAdmin />} />
                <Route path="reviews" element={<ReviewsAdmin />} />
                <Route path="push-notifications" element={<PushNotificationsAdmin />} />
                <Route path="reports" element={<ReportsAdmin />} />
                <Route path="sellers" element={<SellerModeration />} />
                <Route path="products-moderation" element={<ProductModeration />} />
                <Route path="curation" element={<Curation />} />
                <Route path="sponsorships" element={<SponsorshipsAdmin />} />
                <Route path="seed" element={<DBSeedAdmin />} />
                <Route path="disputes" element={<DisputeManagement />} />
                <Route path="finances" element={<Finances />} />
                <Route path="marketing" element={<Marketing />} />
                <Route path="newsletter" element={<Newsletter />} />
                <Route path="megamenu" element={<MegaMenuSettings />} />
                <Route path="banners" element={<BannerAdmin />} />
                <Route path="homepage" element={<HomepageBuilder />} />
                <Route path="support" element={<SupportAdmin />} />
                <Route path="launch-checklist" element={<LaunchChecklistAdmin />} />
                <Route path="search-index" element={<SearchIndexAdmin />} />
                <Route path="categories" element={<CategoriesAdmin />} />
                <Route path="settings" element={<SettingsAdmin />} />
                <Route path="users" element={<UsersAdmin />} />
                <Route path="audit-logs" element={<AuditLogsAdmin />} />
                <Route path="translations" element={<TranslationAdmin />} />
                <Route path="site-errors" element={<SiteErrorsAdmin />} />
                <Route path="agents" element={<AgentsAdmin />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </Layout>
  );
};
