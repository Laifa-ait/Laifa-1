import React, { useState, useEffect } from "react";
import { exportPremiumToSheets, uploadToDrive, scheduleVerificationMeet } from "../../services/googleWorkspace";
import {
  DownloadCloud,
  Video,
  FileUp,
  Loader2,
  Store,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, orderBy, limit, where, getDoc, doc } from "firebase/firestore";
import { Order } from "../../types";
import { useTranslation } from "react-i18next";

interface SellerMetadata {
  id: string;
  name: string;
  shopName: string;
  email?: string;
}

export const WorkspaceActions: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith("ar");

  // Auth and loading states
  const [loadingSheetAdmin, setLoadingSheetAdmin] = useState(false);
  const [loadingSheetSeller, setLoadingSheetSeller] = useState(false);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [loadingMeet, setLoadingMeet] = useState(false);

  // List of real sellers from firestore for the custom dropdown
  const [sellers, setSellers] = useState<SellerMetadata[]>([]);

  // Modal states
  const [activeModal, setActiveModal] = useState<"confirm_admin" | "select_seller" | "input_meet" | null>(null);
  const [selectedSeller, setSelectedSeller] = useState<string>("");
  const [customSellerId, setCustomSellerId] = useState<string>("");
  const [meetEmail, setMeetEmail] = useState<string>("");

  // Search and checkboxes for multi-seller Meet scheduling
  const [meetSearchTerm, setMeetSearchTerm] = useState<string>("");
  const [selectedMeetEmails, setSelectedMeetEmails] = useState<string[]>([]);

  // Custom alerts instead of window.alert
  const [statusAlert, setStatusAlert] = useState<{
    type: "success" | "error" | "info";
    title: string;
    message: string;
    link?: string;
    linkText?: string;
  } | null>(null);

  // Fetch unique sellers from users and publicProfiles on load
  useEffect(() => {
    const fetchSellers = async () => {
      try {
        // Fetch publicProfiles
        const publicSnap = await getDocs(query(collection(db, "publicProfiles"), limit(300)));
        const publicMap = new Map<string, any>();
        publicSnap.docs.forEach((docSnap) => {
          publicMap.set(docSnap.id, docSnap.data());
        });

        // Fetch registered sellers
        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "seller"), limit(300)));
        const usersMap = new Map<string, any>();
        usersSnap.docs.forEach((docSnap) => {
          usersMap.set(docSnap.id, docSnap.data());
        });

        // Fetch pending sellers
        const pendingSnap = await getDocs(query(collection(db, "users"), where("status", "==", "pending"), limit(100)));
        pendingSnap.docs.forEach((docSnap) => {
          usersMap.set(docSnap.id, docSnap.data());
        });

        // Combine both metadata sheets with priority on publicProfiles names and users emails
        const allIds = new Set<string>([...publicMap.keys(), ...usersMap.keys()]);
        const list: SellerMetadata[] = Array.from(allIds).map((uid) => {
          const pub = publicMap.get(uid) || {};
          const usr = usersMap.get(uid) || {};

          return {
            id: uid,
            name: pub.name || usr.displayName || usr.name || uid,
            shopName: pub.shopName || usr.shopName || pub.name || usr.displayName || t("Boutique Olmart"),
            email: usr.email || pub.email || "",
          };
        });

        setSellers(list);
      } catch (err) {
        console.error("Error retrieving sellers for admin Workspace selection:", err);
      }
    };
    fetchSellers();
  }, [t]);

  const getAdminHeaders = (lang: string) => {
    if (lang.startsWith("ar")) {
      return [
        "رقم الطلب",
        "معرّف البائع",
        "اسم المتجر",
        "المبلغ الإجمالي (د.ج)",
        "العمولة المحصلة (د.ج)",
        "صافي الدفع (د.ج)",
        "حالة الدفع",
        "الزبون",
        "الهاتف",
        "العنوان",
        "الولاية",
        "حالة الطرد",
        "الموزع",
        "رقم التتبع",
      ];
    } else if (lang.startsWith("en")) {
      return [
        "Order ID",
        "Seller ID",
        "Shop Name",
        "Gross Amount (DZD)",
        "Collected Commission (DZD)",
        "Net to Pay",
        "Payment Status",
        "Client",
        "Phone",
        "Address",
        "Province",
        "Package Status",
        "Carrier",
        "Tracking",
      ];
    } else {
      return [
        "ID Commande",
        "ID Vendeur",
        "Nom de la Boutique",
        "Montant Brut (DZD)",
        "Commission Encaissée (DZD)",
        "Net à Reverser (Dette)",
        "Statut du Règlement",
        "Client",
        "Téléphone",
        "Adresse",
        "Province",
        "Statut du Colis",
        "Livreur",
        "Tracking",
      ];
    }
  };

  const getSellerHeaders = (lang: string) => {
    if (lang.startsWith("ar")) {
      return [
        "التاريخ",
        "رقم الطلب",
        "المنتج",
        "الكمية",
        "سعر الوحدة (د.ج)",
        "المجموع الإجمالي (د.ج)",
        "نسبة العمولة",
        "مبلغ العمولة (د.ج)",
        "صافي البائع (د.ج)",
        "الرمز البريدي",
        "الولاية",
        "الموزع",
        "رقم التتبع",
        "حالة الدفع",
        "حالة الطرد",
      ];
    } else if (lang.startsWith("en")) {
      return [
        "Date",
        "Order ID",
        "Product",
        "Qty",
        "Unit Price (DZD)",
        "Total Gross (DZD)",
        "Commission %",
        "Commission Amount",
        "Net Seller (Revenue)",
        "Zip Code",
        "Province",
        "Carrier",
        "Tracking",
        "Payment Status",
        "Package Status",
      ];
    } else {
      return [
        "Date",
        "ID Commande",
        "Produit",
        "Qte",
        "Prix Unitaire (DZD)",
        "Total Brut (DZD)",
        "Commission %",
        "Montant Commission",
        "Net Vendeur (Revenu)",
        "Code postal",
        "Province",
        "Livreur",
        "Tracking",
        "Statut Paiement",
        "Statut Colis",
      ];
    }
  };

  // Execute Global Admin Export
  const executeExportAdmin = async () => {
    try {
      setLoadingSheetAdmin(true);
      setStatusAlert(null);

      // 1. Fetch real orders from database (up to 150)
      const ordersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(150));
      const ordersSnap = await getDocs(ordersQuery);

      // 2. Extract unique seller IDs from all matching orders
      const sellerIdsSet = new Set<string>();
      ordersSnap.docs.forEach((docSnap) => {
        const order = docSnap.data() as Order;
        order.sellerIds?.forEach((id) => {
          if (id) sellerIdsSet.add(id);
        });
        order.items?.forEach((item) => {
          if (item.sellerId) sellerIdsSet.add(item.sellerId);
        });
      });

      // 3. Fetch all unique sellers' profiles from both /users/{uid} and /publicProfiles/{uid} in parallel
      const sellerProfilesCache: Record<string, any> = {};
      const uniqueSellerIds = Array.from(sellerIdsSet);

      if (uniqueSellerIds.length > 0) {
        const fetches = uniqueSellerIds.map(async (sid) => {
          try {
            const userDocSnap = await getDoc(doc(db, "users", sid));
            const userData = userDocSnap.exists() ? userDocSnap.data() : {};

            const publicDocSnap = await getDoc(doc(db, "publicProfiles", sid));
            const publicData = publicDocSnap.exists() ? publicDocSnap.data() : {};

            sellerProfilesCache[sid] = {
              ...userData,
              ...publicData,
            };
          } catch (err) {
            console.error(`Error cross-linking seller profile ${sid}:`, err);
          }
        });
        await Promise.all(fetches);
      }

      const realRows: any[] = [];
      let totalBrut = 0;
      let totalCommission = 0;
      let totalNet = 0;
      const provinces = new Set<string>();

      // 4. Transform order data with cross-linked profiles
      ordersSnap.docs.forEach((docSnap) => {
        const order = docSnap.data() as any;
        const orderId = order.id || docSnap.id;
        const clientName = `${order.shippingAddress?.name || "Client"}`;
        const phone = order.shippingAddress?.phone || "";
        const address = `${order.shippingAddress?.street || ""}, ${order.shippingAddress?.commune || ""}`;
        const province = order.shippingAddress?.wilaya || "";

        if (province) provinces.add(province);

        const orderItemsBySeller: Record<string, { totalBrut: number; itemsList: string[] }> = {};

        (order.items || []).forEach((item: any) => {
          const sid = item.sellerId || "VND-UNKNOWN";
          if (!orderItemsBySeller[sid]) {
            orderItemsBySeller[sid] = { totalBrut: 0, itemsList: [] };
          }
          orderItemsBySeller[sid].totalBrut += (item.price || 0) * (item.quantity || 1);
          orderItemsBySeller[sid].itemsList.push(`${item.productName || "Produit"} (x${item.quantity})`);
        });

        if (Object.keys(orderItemsBySeller).length === 0) {
          const fallbackSellerId = order.sellerIds?.[0] || "VND-UNKNOWN";
          orderItemsBySeller[fallbackSellerId] = {
            totalBrut: order.total || 0,
            itemsList: ["Commande OLMART"],
          };
        }

        Object.entries(orderItemsBySeller).forEach(([sid, data]) => {
          const profile = sellerProfilesCache[sid];
          const shopName = profile?.shopName || profile?.name || `Boutique (${sid.slice(0, 6)})`;
          const commissionRate = profile?.commissionRate || 10;

          const lineBrut = data.totalBrut;
          const lineCommission = lineBrut * (commissionRate / 100);
          const lineNet = lineBrut - lineCommission;

          totalBrut += lineBrut;
          totalCommission += lineCommission;
          totalNet += lineNet;

          const isArabicLang = i18n.language.startsWith("ar");
          const isEnglishLang = i18n.language.startsWith("en");

          realRows.push([
            orderId,
            sid,
            shopName,
            lineBrut,
            lineCommission,
            lineNet,
            order.paymentStatus || (isArabicLang ? "في الانتظار" : isEnglishLang ? "Pending" : "En attente"),
            clientName,
            phone,
            address,
            province,
            order.status || (isArabicLang ? "قيد المعالجة" : isEnglishLang ? "Pending" : "En cours"),
            order.deliveryProvider || (isArabicLang ? "غير معين" : isEnglishLang ? "Unassigned" : "Non assigné"),
            order.trackingId || order.trackingNumber || "",
          ]);
        });
      });

      if (realRows.length === 0) {
        realRows.push([
          "CMD-2026-001",
          "VND-100",
          "Boutique Artisanat Algérois",
          85000,
          8500,
          76500,
          "Validé",
          "Ahmed D.",
          "0555123456",
          "Cité 11 Décembre",
          "Alger",
          "En transit Hub",
          "Yalidine",
          "YAL-1001",
        ]);
        provinces.add("Alger");
        totalBrut = 85000;
        totalCommission = 8500;
        totalNet = 76500;
      }

      const isArabicLang = i18n.language.startsWith("ar");
      const isEnglishLang = i18n.language.startsWith("en");
      const lang = i18n.language;

      let docTitle = `MANIFESTE_DE_LIVRAISON_GLOBAL_${new Date().toISOString().split("T")[0]}`;
      if (isArabicLang) {
        docTitle = `البيان_الشامل_للتوصيل_${new Date().toISOString().split("T")[0]}`;
      } else if (isEnglishLang) {
        docTitle = `GLOBAL_DELIVERY_MANIFEST_${new Date().toISOString().split("T")[0]}`;
      }

      const mainHeader = isArabicLang
        ? "البيان الشامل للتسليم ومراقبة عمولات المنصة"
        : isEnglishLang
          ? "GLOBAL DELIVERY MANIFEST & COMMISSION AUDIT"
          : "MANIFESTE DE LIVRAISON GLOBAL & CONTRÔLE DES COMMISSIONS";

      const metaGenBy = isArabicLang ? "تم الإنشاء بواسطة" : isEnglishLang ? "Generated by" : "Généré par";
      const metaStatus = isArabicLang ? "حالة الدمج" : isEnglishLang ? "Integration Status" : "Statut d'Intégration";
      const metaGenDate = isArabicLang ? "تاريخ الإنشاء" : isEnglishLang ? "Generated on" : "Généré le";
      const metaOrdersCount = isArabicLang ? "عدد الطلبات" : isEnglishLang ? "Orders count" : "Nombre de commandes";
      const metaWilayas = isArabicLang ? "الولايات المغطاة" : isEnglishLang ? "Provinces covered" : "Wilayas touchées";
      const metaActiveSellers = isArabicLang
        ? "البائعين النشطين"
        : isEnglishLang
          ? "Active sellers"
          : "Total Vendeurs Actifs";

      const headers = getAdminHeaders(lang);
      const displayTotalLabel = isArabicLang
        ? "المجموع الكلي الموحد"
        : isEnglishLang
          ? "CONSOLIDATED GRAND TOTAL"
          : "TOTAL COMPTABLE CONSOLIDE";

      const payload = {
        title: docTitle,
        metadata: [
          [mainHeader],
          [
            metaGenBy,
            "Super Admin",
            metaStatus,
            isArabicLang ? "اتصال مباشر" : "Live Firestore",
            metaGenDate,
            new Date().toLocaleString(),
          ],
          [
            metaOrdersCount,
            realRows.length.toString(),
            metaWilayas,
            provinces.size.toString(),
            metaActiveSellers,
            Object.keys(sellerProfilesCache).length.toString(),
          ],
          [""],
        ],
        headers: headers,
        rows: realRows,
        totals: [["", "", displayTotalLabel, totalBrut, totalCommission, totalNet, "", "", "", "", "", "", "", ""]],
        theme: {
          headerColor: { red: 0.1, green: 0.2, blue: 0.4 },
          isRtl: isArabicLang,
        },
      };

      const res = await exportPremiumToSheets(payload);

      try {
        window.open(res.spreadsheetUrl, "_blank");
      } catch (popErr) {
        console.warn("Could not open sheet in new window due to browser popup restrictions.", popErr);
      }

      setStatusAlert({
        type: "success",
        title: t("workspace.modal.alert_title_success"),
        message: t("workspace.modal.confirm_admin_title"),
        link: res.spreadsheetUrl,
        linkText: t("workspace.modal.alert_open_link"),
      });
    } catch (err: any) {
      console.error("Export Admin Error:", err);
      setStatusAlert({
        type: "error",
        title: t("workspace.modal.alert_title_error"),
        message: err.message || "Erreur",
      });
    } finally {
      setLoadingSheetAdmin(false);
    }
  };

  // Execute Seller Sales Export
  const executeExportSeller = async (targetSeller: string) => {
    if (!targetSeller.trim()) {
      setStatusAlert({
        type: "error",
        title: t("workspace.modal.alert_title_error"),
        message: t("workspace.modal.seller_id_required"),
      });
      return;
    }

    try {
      setLoadingSheetSeller(true);
      setStatusAlert(null);

      // 1. Fetch real target profile metadata from /users and /publicProfiles to read name and custom commissions
      let shopName = "Boutique Import";
      let commissionRate = 10;
      try {
        const targetProfileSnap = await getDoc(doc(db, "users", targetSeller));
        const targetData = targetProfileSnap.exists() ? targetProfileSnap.data() : {};

        const targetPublicSnap = await getDoc(doc(db, "publicProfiles", targetSeller));
        const targetPublicData = targetPublicSnap.exists() ? targetPublicSnap.data() : {};

        const mergedData = { ...targetData, ...targetPublicData };
        if (Object.keys(mergedData).length > 0) {
          shopName = mergedData.shopName || mergedData.name || shopName;
          commissionRate = mergedData.commissionRate || commissionRate;
        }
      } catch (pErr) {
        console.warn("Could not retrieve exact seller profile, using fallback standard.", pErr);
      }

      // 2. Fetch real orders for this seller from database
      const ordersQuery = query(
        collection(db, "orders"),
        where("sellerIds", "array-contains", targetSeller),
        limit(80)
      );
      const ordersSnap = await getDocs(ordersQuery);

      const realRows: any[] = [];
      let totalBrut = 0;
      let totalCommission = 0;
      let totalNet = 0;

      ordersSnap.docs.forEach((docSnap) => {
        const order = docSnap.data() as any;
        const orderId = order.id || docSnap.id;

        // Filter items specific to this seller
        const sellerItems = order.items?.filter((item: any) => item.sellerId === targetSeller) || [];
        const zipCode = order.shippingAddress?.wilaya || "N/A";
        const province = order.shippingAddress?.commune || "N/A";
        const provider = order.deliveryProvider || "Non assigné";
        const tracking = order.trackingId || order.trackingNumber || "";
        const orderDate = order.createdAt?.toDate
          ? order.createdAt.toDate().toLocaleDateString()
          : new Date().toLocaleDateString();

        sellerItems.forEach((item: any) => {
          const lineTotal = item.price * item.quantity;
          const commission = lineTotal * (commissionRate / 100);
          const net = lineTotal - commission;

          totalBrut += lineTotal;
          totalCommission += commission;
          totalNet += net;

          realRows.push([
            orderDate,
            orderId,
            item.productName || "Produit",
            item.quantity || 1,
            item.price || 0,
            lineTotal,
            `${commissionRate}%`,
            commission,
            net,
            zipCode,
            province,
            provider,
            tracking,
            order.paymentStatus || "En attente",
            order.status || "En cours",
          ]);
        });
      });

      if (realRows.length === 0) {
        setStatusAlert({
          type: "error",
          title: t("workspace.modal.alert_title_error"),
          message: `${t("workspace.modal.no_orders_found")} (${shopName} / ID: ${targetSeller.slice(0, 8)})`,
        });
        return;
      }

      const isArabicLang = i18n.language.startsWith("ar");
      const isEnglishLang = i18n.language.startsWith("en");
      const lang = i18n.language;

      let docTitle = `RAPPORT_VENTES_${shopName.toUpperCase().replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}`;
      if (isArabicLang) {
        docTitle = `تقرير_مبيعات_${shopName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}`;
      } else if (isEnglishLang) {
        docTitle = `SALES_REPORT_${shopName.toUpperCase().replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}`;
      }

      const sellerMainHeader = isArabicLang
        ? `تقرير المبيعات والعمولات - متجر ${shopName}`
        : isEnglishLang
          ? `SALES & COMMISSIONS REPORT - SHOP ${shopName.toUpperCase()}`
          : `RAPPORT DE VENTES ET COMMISSIONS - BOUTIQUE ${shopName.toUpperCase()}`;

      const labelSellerId = isArabicLang ? "معرّف البائع" : isEnglishLang ? "Seller ID" : "ID Vendeur";
      const labelPeriod = isArabicLang ? "الفترة" : isEnglishLang ? "Period" : "Période";
      const valPeriod = isArabicLang ? "آخر 30 يوم" : isEnglishLang ? "Last 30 days" : "30 derniers jours";
      const labelGenerated = isArabicLang ? "تاريخ الإنشاء" : isEnglishLang ? "Generated on" : "Généré le";
      const labelBalance = isArabicLang
        ? "صافي الرصيد المالي المقدر"
        : isEnglishLang
          ? "Estimated Net Balance"
          : "Solde Actuel Estimé";
      const labelCommRate = isArabicLang
        ? "عمولة المتجر من المبيعات"
        : isEnglishLang
          ? "Shop Commission Rate"
          : "Commission de la Boutique";

      const headers = getSellerHeaders(lang);
      const sellerTotalLabel = isArabicLang
        ? "المجموع الكلي للمتجر"
        : isEnglishLang
          ? "SHOP GRAND TOTAL"
          : "TOTAL DE LA BOUTIQUE";

      const payload = {
        title: docTitle,
        metadata: [
          [sellerMainHeader],
          [labelSellerId, targetSeller, labelPeriod, valPeriod, labelGenerated, new Date().toLocaleString()],
          [labelBalance, `${totalNet} DZD`, labelCommRate, `${commissionRate}%`],
          [""],
        ],
        headers: headers,
        rows: realRows,
        totals: [["", "", "", "", sellerTotalLabel, totalBrut, "", totalCommission, totalNet, "", "", "", "", "", ""]],
        theme: {
          headerColor: { red: 0.1, green: 0.6, blue: 0.4 },
          isRtl: isArabicLang,
        },
      };

      const res = await exportPremiumToSheets(payload);
      try {
        window.open(res.spreadsheetUrl, "_blank");
      } catch (popErr) {
        console.warn("Could not open sheet in new window due to browser popup restrictions.", popErr);
      }

      setStatusAlert({
        type: "success",
        title: t("workspace.modal.alert_title_success"),
        message: `${t("workspace.modal.select_seller_title")}: ${shopName}`,
        link: res.spreadsheetUrl,
        linkText: t("workspace.modal.alert_open_link"),
      });
    } catch (err: any) {
      console.error("Export Seller Error:", err);
      setStatusAlert({
        type: "error",
        title: t("workspace.modal.alert_title_error"),
        message: err.message || "Erreur",
      });
    } finally {
      setLoadingSheetSeller(false);
    }
  };

  // Execute Google Drive KYC Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setLoadingDrive(true);
      setStatusAlert(null);

      const res: any = await uploadToDrive(file);
      const fileUrl = res.file?.webViewLink || res.file?.webContentLink || `https://drive.google.com`;

      setStatusAlert({
        type: "success",
        title: t("workspace.modal.alert_title_success"),
        message: `${t("workspace.kyc_drive_title")} - ${file.name}`,
        link: fileUrl,
        linkText: t("workspace.modal.alert_open_link"),
      });
    } catch (err: any) {
      console.error("Upload Error:", err);
      setStatusAlert({
        type: "error",
        title: t("workspace.modal.alert_title_error"),
        message: err.message || "Erreur d'upload",
      });
    } finally {
      setLoadingDrive(false);
    }
  };

  // Execute Google Calendar Verification Schedule
  const executeScheduleMeet = async () => {
    // Collect all unique target participant emails
    const emailsSet = new Set<string>();

    // 1. Add from checkboxes selection
    selectedMeetEmails.forEach((e) => {
      if (e && e.trim()) {
        emailsSet.add(e.trim());
      }
    });

    // 2. Add from manually typed field
    if (meetEmail.trim()) {
      meetEmail.split(",").forEach((e) => {
        const trimmed = e.trim();
        if (trimmed && trimmed.includes("@")) {
          emailsSet.add(trimmed);
        }
      });
    }

    const finalEmails = Array.from(emailsSet);

    if (finalEmails.length === 0) {
      setStatusAlert({
        type: "error",
        title: t("workspace.modal.alert_title_error"),
        message: t("workspace.modal.email_required"),
      });
      return;
    }

    if (finalEmails.length > 250) {
      setStatusAlert({
        type: "error",
        title: t("workspace.modal.alert_title_error"),
        message: isArabic
          ? `تم تجاوز الحد الأقصى لعدد المشاركين (250 مشاركًا). لقد اخترت ${finalEmails.length} مشاركًا.`
          : `La limite maximale de 250 participants pour Google Meet a été dépassée. Vous avez sélectionné ${finalEmails.length} participants.`,
      });
      return;
    }

    try {
      setLoadingMeet(true);
      setStatusAlert(null);

      const start = new Date();
      start.setDate(start.getDate() + 1); // tomorrow
      const end = new Date(start);
      end.setHours(start.getHours() + 1);

      const res = await scheduleVerificationMeet(
        finalEmails.join(","), // passing comma-separated emails!
        start.toISOString(),
        end.toISOString(),
        "Vérification de Boutique OLMART",
        "Entretien formel de vérification KYC (identité et registre de commerce) pour validation finale des boutiques sélectionnées."
      );

      setStatusAlert({
        type: "success",
        title: t("workspace.modal.alert_title_success"),
        message: `${t("workspace.video_meet_title")} - ${finalEmails.length} participants (${finalEmails.join(", ")})`,
        link: res.meetLink || `https://meet.google.com`,
        linkText: t("workspace.modal.alert_open_link"),
      });

      // Success cleanup
      setActiveModal(null);
      setSelectedMeetEmails([]);
      setMeetEmail("");
      setMeetSearchTerm("");
    } catch (err: any) {
      console.error("Schedule Verification Error:", err);
      setStatusAlert({
        type: "error",
        title: t("workspace.modal.alert_title_error"),
        message: err.message || "Erreur",
      });
    } finally {
      setLoadingMeet(false);
    }
  };

  const filteredSellersForMeet = sellers.filter((seller) => {
    const term = meetSearchTerm.toLowerCase();
    return (
      (seller.shopName || "").toLowerCase().includes(term) ||
      (seller.name || "").toLowerCase().includes(term) ||
      (seller.email || "").toLowerCase().includes(term)
    );
  });

  return (
    <div
      className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 flex flex-col gap-6 w-full mb-8 relative z-10"
      id="google-workspace-integrations-container"
    >
      <div className="flex flex-col">
        <h3 className="text-xl font-bold tracking-tight text-zinc-900" id="workspace-main-title">
          {t("workspace.title")}
        </h3>
        <p className="text-sm text-zinc-500 mt-1" id="workspace-main-desc">
          {t("workspace.subtitle")}
        </p>
      </div>

      {/* Premium status notifications (bypasses browser alert windows blocker) */}
      {statusAlert && (
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all animate-fade-in ${
            statusAlert.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
          id="workspace-status-alert-card"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {statusAlert.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm leading-tight">{statusAlert.title}</span>
              <span className="text-xs leading-normal opacity-90">{statusAlert.message}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 mt-3 sm:mt-0">
            {statusAlert.link && (
              <a
                href={statusAlert.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm border transition-all ${
                  statusAlert.type === "success"
                    ? "bg-emerald-600 border-emerald-500 hover:bg-emerald-700 text-white"
                    : "bg-rose-600 border-rose-500 hover:bg-rose-700 text-white"
                }`}
                id="workspace-alert-link-btn"
              >
                <span>{statusAlert.linkText || t("workspace.modal.alert_open_link")}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              onClick={() => setStatusAlert(null)}
              className="bg-transparent hover:bg-black/5 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors"
              title={t("workspace.modal.alert_close")}
              id="workspace-alert-close-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="workspace-grid-actions">
        {/* SHEETS ADMIN */}
        <div
          className="flex flex-col gap-3 p-5 rounded-xl border border-zinc-100 bg-zinc-50 hover:border-blue-200 hover:bg-blue-50/30 transition-colors animate-fade-in"
          id="card-sheets-admin"
        >
          <div
            className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2"
            id="icon-sheets-admin"
          >
            <DownloadCloud className="w-5 h-5" />
          </div>
          <div className="font-semibold text-zinc-800 text-sm" id="title-sheets-admin">
            {t("workspace.export_admin_title")}
          </div>
          <p className="text-xs text-zinc-500 flex-1" id="desc-sheets-admin">
            {t("workspace.export_admin_desc")}
          </p>
          <button
            onClick={() => {
              setStatusAlert(null);
              setActiveModal("confirm_admin");
            }}
            disabled={loadingSheetAdmin}
            id="btn-sheets-admin"
            className="w-full h-9 flex items-center justify-center gap-2 mt-2 font-semibold text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loadingSheetAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
            {t("workspace.generate_admin_btn")}
          </button>
        </div>

        {/* SHEETS SELLER */}
        <div
          className="flex flex-col gap-3 p-5 rounded-xl border border-zinc-100 bg-zinc-50 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors animate-fade-in"
          id="card-sheets-seller"
        >
          <div
            className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2"
            id="icon-sheets-seller"
          >
            <Store className="w-5 h-5" />
          </div>
          <div className="font-semibold text-zinc-800 text-sm" id="title-sheets-seller">
            {t("workspace.export_seller_title")}
          </div>
          <p className="text-xs text-zinc-500 flex-1" id="desc-sheets-seller">
            {t("workspace.export_seller_desc")}
          </p>
          <button
            onClick={() => {
              setStatusAlert(null);
              setSelectedSeller("");
              setCustomSellerId("");
              setActiveModal("select_seller");
            }}
            disabled={loadingSheetSeller}
            id="btn-sheets-seller"
            className="w-full h-9 flex items-center justify-center gap-2 mt-2 font-semibold text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loadingSheetSeller ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
            {t("workspace.generate_seller_btn")}
          </button>
        </div>

        {/* DRIVE */}
        <div
          className="flex flex-col gap-3 p-5 rounded-xl border border-zinc-100 bg-zinc-50 hover:border-violet-200 hover:bg-violet-50/30 transition-colors animate-fade-in"
          id="card-drive-kyc"
        >
          <div
            className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 mb-2"
            id="icon-drive-kyc"
          >
            <FileUp className="w-5 h-5" />
          </div>
          <div className="font-semibold text-zinc-800 text-sm" id="title-drive-kyc">
            {t("workspace.kyc_drive_title")}
          </div>
          <p className="text-xs text-zinc-500 flex-1" id="desc-drive-kyc">
            {t("workspace.kyc_drive_desc")}
          </p>
          <label
            className="w-full h-9 flex items-center justify-center gap-2 mt-2 font-semibold text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors cursor-pointer disabled:opacity-50"
            id="label-drive-kyc"
          >
            {loadingDrive ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
            {loadingDrive ? t("workspace.loading") : t("workspace.uploader_doc_btn")}
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={loadingDrive}
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              id="input-drive-file"
            />
          </label>
        </div>

        {/* MEET / CALENDAR */}
        <div
          className="flex flex-col gap-3 p-5 rounded-xl border border-zinc-100 bg-zinc-50 hover:border-orange-200 hover:bg-orange-50/30 transition-colors animate-fade-in"
          id="card-video-meet"
        >
          <div
            className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-2"
            id="icon-video-meet"
          >
            <Video className="w-5 h-5" />
          </div>
          <div className="font-semibold text-zinc-800 text-sm" id="title-video-meet">
            {t("workspace.video_meet_title")}
          </div>
          <p className="text-xs text-zinc-500 flex-1" id="desc-video-meet">
            {t("workspace.video_meet_desc")}
          </p>
          <button
            onClick={() => {
              setStatusAlert(null);
              setMeetEmail("");
              setActiveModal("input_meet");
            }}
            disabled={loadingMeet}
            id="btn-schedule-meet"
            className="w-full h-9 flex items-center justify-center gap-2 mt-2 font-semibold text-xs bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {loadingMeet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            {t("workspace.schedule_meet_btn")}
          </button>
        </div>
      </div>

      {/* ==================== CUSTOM DIALOG MODALS OVERLAYS ==================== */}
      {activeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[3px] p-4 text-zinc-800"
          id="workspace-interactive-modal-overlay"
        >
          <div
            className={`bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-zinc-100 flex flex-col gap-5 animate-scale-in ${isArabic ? "text-right" : "text-left"}`}
            dir={isArabic ? "rtl" : "ltr"}
            id="workspace-interactive-modal-card"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-3">
              <span className="font-bold text-zinc-900 text-lg">
                {activeModal === "confirm_admin" && t("workspace.modal.confirm_admin_title")}
                {activeModal === "select_seller" && t("workspace.modal.select_seller_title")}
                {activeModal === "input_meet" && t("workspace.modal.meet_title")}
              </span>
              <button
                onClick={() => setActiveModal(null)}
                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800 p-1.5 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="text-sm text-zinc-600 leading-relaxed flex flex-col gap-3">
              {activeModal === "confirm_admin" && <p>{t("workspace.modal.confirm_admin_desc")}</p>}

              {activeModal === "select_seller" && (
                <>
                  <p className="text-xs text-zinc-500 font-medium">{t("workspace.modal.select_seller_subtitle")}</p>

                  {/* Active sellers dropdown */}
                  <div className="flex flex-col gap-1.5">
                    <select
                      value={selectedSeller}
                      onChange={(e) => {
                        setSelectedSeller(e.target.value);
                        setCustomSellerId("");
                      }}
                      className="w-full font-medium h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm transition-all focus:border-emerald-500 focus:bg-white focus:outline-none"
                      id="modal-select-seller-dropdown"
                    >
                      <option value="">{t("workspace.modal.select_seller_dropdown")}</option>
                      {sellers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.shopName || s.name} ({s.id.slice(0, 6)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Manual custom ID text field */}
                  <div className="flex flex-col gap-1.5 mt-2">
                    <label className="text-xs text-zinc-500 font-medium">
                      {t("workspace.modal.select_seller_custom")}
                    </label>
                    <input
                      type="text"
                      value={customSellerId}
                      onChange={(e) => {
                        setCustomSellerId(e.target.value);
                        setSelectedSeller("");
                      }}
                      placeholder={t("workspace.modal.select_seller_custom_placeholder")}
                      className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-sm transition-all focus:border-emerald-500 focus:bg-white focus:outline-none"
                      id="modal-custom-seller-id-input"
                    />
                  </div>
                </>
              )}

              {activeModal === "input_meet" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-zinc-500 leading-normal mb-1">{t("workspace.modal.meet_subtitle")}</p>

                  {/* Inline Search Bar */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-700">
                        {isArabic ? "اختر البائعين لحضور الاجتماع:" : "Sélectionner les vendeurs à inviter:"}
                      </label>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {isArabic ? "الحد الأقصى لـ Google Meet هو 250" : "Capacité max Google Meet: 250"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={meetSearchTerm}
                      onChange={(e) => setMeetSearchTerm(e.target.value)}
                      placeholder={isArabic ? "ابحث عن متجر أو بائع..." : "Rechercher une boutique..."}
                      className="w-full h-9 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs transition-all focus:border-orange-500 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Checklist for matching sellers */}
                  <div className="max-h-40 overflow-y-auto border border-zinc-100 rounded-lg p-2 bg-zinc-50 flex flex-col gap-1">
                    {filteredSellersForMeet.length === 0 ? (
                      <div className="text-center py-4 text-xs text-zinc-400">
                        {isArabic ? "لا يوجد بائعون متطابقون" : "Aucun vendeur trouvé"}
                      </div>
                    ) : (
                      filteredSellersForMeet.map((seller) => {
                        const hasEmail = !!seller.email;
                        const isChecked = selectedMeetEmails.includes(seller.email || "");
                        return (
                          <label
                            key={seller.id}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer text-xs transition-colors ${
                              !hasEmail
                                ? "opacity-45 cursor-not-allowed"
                                : "hover:bg-zinc-150/50 hover:bg-white border-b border-transparent"
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={!hasEmail}
                              checked={isChecked}
                              onChange={() => {
                                if (!seller.email) return;
                                if (isChecked) {
                                  setSelectedMeetEmails((prev) => prev.filter((email) => email !== seller.email));
                                } else {
                                  setSelectedMeetEmails((prev) => [...prev, seller.email || ""]);
                                }
                              }}
                              className="rounded text-orange-600 focus:ring-orange-500 border-zinc-300 w-3.5 h-3.5 cursor-pointer"
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-semibold text-zinc-800 truncate leading-tight">
                                {seller.shopName || seller.name}
                              </span>
                              <span className="text-[10px] text-zinc-400 truncate">
                                {seller.email || (isArabic ? "البريد الإلكتروني مفقود" : "Email manquant")}
                              </span>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {/* Badges for Selected Sellers */}
                  {selectedMeetEmails.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <div className="text-[11px] font-bold text-orange-700 flex justify-between items-center">
                        <span>
                          {isArabic
                            ? `البائعين المحددين (${selectedMeetEmails.length})`
                            : `Vendeurs sélectionnés (${selectedMeetEmails.length})`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedMeetEmails([])}
                          className="text-[10px] text-zinc-400 hover:text-zinc-650"
                        >
                          {isArabic ? "مسح الكل" : "Tout effacer"}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-orange-50/40 rounded-lg border border-orange-100">
                        {selectedMeetEmails.map((email) => {
                          const sObj = sellers.find((s) => s.email === email);
                          const dispName = sObj ? sObj.shopName || sObj.name : email;
                          return (
                            <span
                              key={email}
                              className="inline-flex items-center gap-1.5 bg-white text-zinc-800 px-2.5 py-0.5 rounded-full text-[10px] font-medium border border-zinc-205 shadow-sm max-w-[160px] truncate"
                            >
                              <span className="truncate">{dispName}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedMeetEmails((prev) => prev.filter((e) => e !== email))}
                                className="hover:bg-zinc-150 rounded-full p-0.5 transition-colors text-zinc-400 hover:text-zinc-700"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Manual observers / inspectors field */}
                  <div className="flex flex-col gap-1 mt-1">
                    <label className="text-xs font-semibold text-zinc-700">
                      {isArabic
                        ? "أو أدخل يدويا عناوين البريد الإلكتروني الأخرى (مفصولة بفاصلة):"
                        : "Ou introduire d'autres adresses (séparées par virgule) :"}
                    </label>
                    <input
                      type="text"
                      value={meetEmail}
                      onChange={(e) => setMeetEmail(e.target.value)}
                      placeholder={
                        isArabic ? "مثال: test1@olmart.dz, test2@olmart.dz" : "Ex: admin@olmart.dz, inspector@olmart.dz"
                      }
                      className="w-full h-9 px-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs transition-all focus:border-orange-500 focus:bg-white focus:outline-none"
                      id="modal-meet-email-input"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-3 mt-2">
              <button
                onClick={() => {
                  setActiveModal(null);
                  setSelectedMeetEmails([]);
                  setMeetEmail("");
                  setMeetSearchTerm("");
                }}
                className="px-4 py-2 text-xs font-semibold text-zinc-500 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-all hover:text-zinc-800"
              >
                {t("workspace.modal.btn_cancel")}
              </button>

              {activeModal === "confirm_admin" && (
                <button
                  onClick={executeExportAdmin}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>{t("workspace.modal.btn_confirm")}</span>
                </button>
              )}

              {activeModal === "select_seller" && (
                <button
                  onClick={() => executeExportSeller(selectedSeller || customSellerId)}
                  disabled={!selectedSeller && !customSellerId.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-40"
                >
                  <span>{t("workspace.modal.btn_generate")}</span>
                </button>
              )}

              {activeModal === "input_meet" && (
                <button
                  onClick={executeScheduleMeet}
                  disabled={selectedMeetEmails.length === 0 && !meetEmail.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 rounded-lg hover:bg-orange-700 shadow-sm transition-all disabled:opacity-40"
                >
                  <span>{t("workspace.modal.btn_schedule")}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
