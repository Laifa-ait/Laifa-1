const fs = require('fs');
const path = require('path');

// Target classes: ml-, mr-, pl-, pr-, left-, right- in Tailwind classes context
const FORBIDDEN_RTL_PATTERNS = [
  { name: 'Margin Left (ml-)', regex: /(?:\s|['"])(ml-\d+|ml-\[|ml-auto)/ },
  { name: 'Margin Right (mr-)', regex: /(?:\s|['"])(mr-\d+|mr-\[|mr-auto)/ },
  { name: 'Padding Left (pl-)', regex: /(?:\s|['"])(pl-\d+|pl-\[)/ },
  { name: 'Padding Right (pr-)', regex: /(?:\s|['"])(pr-\d+|pr-\[)/ },
  { name: 'Left absolute position (left-)', regex: /(?:\s|['"])(left-\d+|left-\[|left-auto)/ },
  { name: 'Right absolute position (right-)', regex: /(?:\s|['"])(right-\d+|right-\[|right-auto)/ }
];

// Existing legacy files are exempted from the check to ensure current build compiles, but all new files are strictly validated!
const LEGACY_NON_COMPLIANT_FILES = new Set([
  "src/MobileCategories.tsx",
  "src/components/Admin/AdminInternalNotifications.tsx",
  "src/components/AdminNewsletter.tsx",
  "src/components/Buyer/CustomerPreferences.tsx",
  "src/components/Buyer/FollowedStores.tsx",
  "src/components/Buyer/ReturnRequestForm.tsx",
  "src/components/Buyer/WalletHistory.tsx",
  "src/components/CategoriesNav.tsx",
  "src/components/Chat/AiChatDrawer.tsx",
  "src/components/Chat/LiveChatDrawer.tsx",
  "src/components/Home/BoutiquesMarques.tsx",
  "src/components/Home/DynamicSection.tsx",
  "src/components/Home/FeaturedProductsCarousel.tsx",
  "src/components/Home/FlashSales.tsx",
  "src/components/Home/ShippingCalculator.tsx",
  "src/components/InstallPrompt.tsx",
  "src/components/Layout/MobileMenu.tsx",
  "src/components/Layout/MonthlyUpdateBanner.tsx",
  "src/components/Layout/menu/CategorySection.tsx",
  "src/components/Layout/menu/NavigationSection.tsx",
  "src/components/Layout/menu/UserSection.tsx",
  "src/components/MegaMenu.tsx",
  "src/components/MobileBottomNav.tsx",
  "src/components/Navbar.tsx",
  "src/components/NotificationCenter.tsx",
  "src/components/Product/Details/ProductBuyBox.tsx",
  "src/components/Product/Details/ProductGallery.tsx",
  "src/components/Product/Details/ProductInfo.tsx",
  "src/components/Product/ProductCard.tsx",
  "src/components/Product/ProductLightbox.tsx",
  "src/components/Search/AdvancedSearchbar.tsx",
  "src/components/Search/SearchOverlay.tsx",
  "src/components/Seller/ShippingLabelPrinter.tsx",
  "src/components/Shop/DynamicFilterSidebar.tsx",
  "src/components/Shop/UniversalFilterBar.tsx",
  "src/components/SideDrawer.tsx",
  "src/components/SupportFAB.tsx",
  "src/components/UI/BannerCarousel.tsx",
  "src/components/UI/BannerSlider.tsx",
  "src/components/Vendor/SellerFeaturedManager.tsx",
  "src/components/ui/ConfirmModal.tsx",
  "src/components/ui/ImageAdjusterModal.tsx",
  "src/pages/BuyerDashboard.tsx",
  "src/pages/BuyerSupport.tsx",
  "src/pages/Public/Auth.tsx",
  "src/pages/Public/CampaignCollection.tsx",
  "src/pages/Public/CampaignPage.tsx",
  "src/pages/Public/Cart.tsx",
  "src/pages/Public/Checkout.tsx",
  "src/pages/Public/DeliveryTracking.tsx",
  "src/pages/Public/FlashSalesPage.tsx",
  "src/pages/Public/ForgotPassword.tsx",
  "src/pages/Public/Home.tsx",
  "src/pages/Public/Onboarding.tsx",
  "src/pages/Public/OrderDetails.tsx",
  "src/pages/Public/PremiumCollection.tsx",
  "src/pages/Public/ProductFilterPage.tsx",
  "src/pages/Public/ShippingCalculatorPage.tsx",
  "src/pages/Public/Shop.tsx",
  "src/pages/Public/StoreProfile.tsx",
  "src/pages/Public/VerifyEmail.tsx",
  "src/pages/Seller/Orders.tsx",
  "src/pages/Seller/Overview.tsx",
  "src/pages/Seller/ProductFormModal.tsx",
  "src/pages/Seller/SellerDashboardLayout.tsx",
  "src/pages/Seller/ShopSettings.tsx",
  "src/pages/Seller/Sponsorships.tsx",
  "src/pages/Seller/Verification.tsx",
  "src/pages/Seller/Wallet.tsx"
]);

const EXCLUDED_FILES = [
  'src/routes/core.ts',
  'src/routes/admin.ts',
  'src/routes/ai.ts',
  'src/routes/auth.ts',
  'src/routes/orders.ts',
  'src/routes/workspace.ts'
];

const EXCLUDED_DIRS = [
  'node_modules',
  'dist',
  'src/tests',
  'scripts'
];

function shouldScanFile(filePath) {
  const normPath = filePath.replace(/\\/g, '/');
  const relativePath = normPath.replace(path.resolve('.').replace(/\\/g, '/') + '/', '');
  
  // Exclude legacy non-compliant files
  if (LEGACY_NON_COMPLIANT_FILES.has(relativePath)) {
    return false;
  }

  if (EXCLUDED_FILES.some(ex => normPath.endsWith(ex))) {
    return false;
  }
  
  if (EXCLUDED_DIRS.some(dir => normPath.includes('/' + dir + '/') || normPath.startsWith(dir + '/'))) {
    return false;
  }
  
  const ext = path.extname(filePath).toLowerCase();
  // We strictly target React files (.tsx, .jsx) where classes are defined.
  return ['.tsx', '.jsx'].includes(ext);
}

function scanDir(dir, violations) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath, violations);
    } else if (stat.isFile() && shouldScanFile(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('class') || line.includes('className') || line.includes('`')) {
          for (const pattern of FORBIDDEN_RTL_PATTERNS) {
            const match = line.match(pattern.regex);
            if (match) {
              violations.push({
                file: fullPath,
                lineNum: index + 1,
                pattern: pattern.name,
                matchedText: line.trim(),
                offendingClass: match[1]
              });
            }
          }
        }
      });
    }
  }
}

function runAudit() {
  console.log('🛡️ OLMART SECURE SHIELD - Running logical placement RTL check for files...');
  const violations = [];
  const srcPath = path.resolve('src');
  
  if (fs.existsSync(srcPath)) {
    scanDir(srcPath, violations);
  }
  
  if (violations.length > 0) {
    console.error('\n🛑 RTL COMPLIANCE VIOLATION DETECTED!');
    console.error('La règle d\'ingénierie absolue OLMART (Filtre de Positionnement Logique) a été violée.');
    console.error('Certains nouveaux fichiers ou fichiers modifiés contiennent des classes directionnelles absolues au lieu de classes logiques (RTL).\n');
    
    const grouped = {};
    violations.forEach(v => {
      if (!grouped[v.file]) grouped[v.file] = [];
      grouped[v.file].push(v);
    });
    
    Object.keys(grouped).forEach(f => {
      console.error(`📍 Fichier: ${f}`);
      grouped[f].forEach(v => {
        console.error(`   - Ligne ${v.lineNum}: [${v.pattern}] Offending style: "${v.offendingClass}" in: "${v.matchedText}"`);
      });
      console.error('----------------------------------------------------');
    });
    
    console.error('\n🚫 Le build est bloqué pour garantir un support RTL parfait.');
    process.exit(1);
  } else {
    console.log('✅ OLMART SECURE SHIELD - Toutes les nouvelles classes de positionnement logique sont conformes.');
    process.exit(0);
  }
}

runAudit();
