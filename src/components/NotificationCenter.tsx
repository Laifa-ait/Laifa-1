import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, MessageSquare, Truck, Check, ShieldCheck, Ticket, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from "firebase/firestore";
import { formatPrice } from "../utils/format";
import { useTranslation } from "react-i18next";

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type:
    | "message"
    | "status_shipped"
    | "status_delivered"
    | "support"
    | "coupon"
    | "system"
    | "new_order"
    | "dispute"
    | "withdrawal";
  link: string;
  read: boolean;
}

export const NotificationCenter: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [orderNotifications, setOrderNotifications] = useState<NotificationItem[]>([]);
  const [directNotifications, setDirectNotifications] = useState<NotificationItem[]>([]);
  const [globalCoupons, setGlobalCoupons] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse active language
  const lang = (i18n.language || "fr").substring(0, 2) as "fr" | "en" | "ar";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync / Fetch live firebase events
  useEffect(() => {
    if (!currentUser) {
      // Offline fallback notifications (e.g., campaign info, platform system messages)
      setOrderNotifications([
        {
          id: "welcome-off",
          title: t("notif.welcome_title") || "Bienvenue sur Olma 🇩🇿",
          description:
            t("notif.welcome_desc") || "La marketplace des créations de nos 58 Wilayas. Vos achats sont protégés.",
          time: t("A l'instant"),
          type: "system",
          link: "/shop",
          read: false,
        },
        {
          id: "promo-off",
          title: t("notif.promo_title") || "Livraison Offerte",
          description: t("notif.promo_desc") || "Profitez de réductions exclusives de la part des vendeurs !",
          time: t("notif.two_hours_ago") || "Il y a 2h",
          type: "coupon",
          link: "/shop",
          read: false,
        },
      ]);
      setDirectNotifications([]);
      return;
    }

    // 1. Fetch orders of current buyer to see status updates
    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", currentUser.uid),
      orderBy("updatedAt", "desc"),
      limit(10)
    );

    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orderDocs = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
        const newNotifications: NotificationItem[] = [];

        orderDocs.forEach((order) => {
          const orderIdShort = order.id.substring(0, 8);
          const orderTime = order.updatedAt?.seconds
            ? new Date(order.updatedAt.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : t("A l'instant");

          if (order.status === "shipped") {
            newNotifications.push({
              id: `shipped-${order.id}`,
              title: t("notif.shipped_title") || `🚨 Ça arrive !`,
              description: `${t("notif.shipped_desc") || "L'artisan a remis votre colis au livreur. Préparez les "}${formatPrice(order.total || 0)}${t(" en espèces.")}`,
              time: orderTime,
              type: "status_shipped",
              link: `/dashboard/buyer`,
              read: localStorage.getItem(`notif_read_shipped-${order.id}`) === "true",
            });
          } else if (order.status === "delivered") {
            newNotifications.push({
              id: `delivered-${order.id}`,
              title: t("notif.delivered_title") || `📍 Le livreur est là !`,
              description: `${t("notif.delivered_desc") || "Gardez votre téléphone près de vous aujourd'hui pour réceptionner votre commande #"}${orderIdShort}.`,
              time: orderTime,
              type: "status_delivered",
              link: `/dashboard/buyer`,
              read: localStorage.getItem(`notif_read_delivered-${order.id}`) === "true",
            });
          } else {
            newNotifications.push({
              id: `pending-${order.id}`,
              title: `${t("notif.order_recorded") || "Commande #"} ${orderIdShort} ${t("notif.registered") || "Enregistrée"}`,
              description: t("notif.pending_desc") || `Le vendeur prépare votre colis en paiement CASH à la livraison.`,
              time: orderTime,
              type: "system",
              link: `/dashboard/buyer`,
              read: localStorage.getItem(`notif_read_pending-${order.id}`) === "true",
            });
          }
        });

        // Also support custom static user notifications
        newNotifications.push({
          id: "support-hub",
          title: t("notif.support_title") || "Messagerie Olma active 💬",
          description: t("notif.support_desc") || "Échangez directement avec les artisans depuis le suivi de commande.",
          time: t("notif.permanent") || "Permanent",
          type: "message",
          link: "/dashboard/buyer",
          read: localStorage.getItem("notif_read_support-hub") === "true",
        });

        setOrderNotifications(newNotifications);
      },
      (error) => {
        console.warn("NotificationCenter: orders listener skipped or missing indexes:", error);
      }
    );

    // 2. Fetch secure target user notifications (Created via our premium backend endpoint)
    const directNotifsQuery = query(
      collection(db, "user_notifications"),
      where("recipientId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    let initialLoad = true;
    const unsubscribeDirect = onSnapshot(
      directNotifsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (!initialLoad && change.type === "added") {
            const data = change.doc.data();
            const titleText = data.title ? data.title[lang] || data.title.fr || data.title : "Notification";
            const descText = data.message ? data.message[lang] || data.message.fr || data.message : "";

            if (!data.read && "Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(typeof titleText === "string" ? titleText : "Nouvelle alerte", {
                  body: typeof descText === "string" ? descText : "Vous avez une nouvelle notification.",
                  icon: "/icon.png",
                  badge: "/icon.png",
                });
              } catch (err) {
                console.warn("Failed sending native push", err);
              }
            }
          }
        });
        initialLoad = false;

        const docs = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          const timeStr = data.createdAt?.seconds
            ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "À l'instant";

          // Dynamic multi-language resolution
          const titleText = data.title ? data.title[lang] || data.title.fr || data.title : "Notification";
          const descText = data.message ? data.message[lang] || data.message.fr || data.message : "";

          // Determine destination link depending on notification payload
          let computedLink = "/dashboard/buyer";
          if (userProfile?.role === "seller") {
            computedLink = "/dashboard/seller";
            if (data.type === "new_order" || data.type === "order") {
              computedLink = "/dashboard/seller/orders";
            } else if (data.type === "support" || data.type === "message") {
              computedLink = "/dashboard/seller/support";
            }
          } else {
            computedLink = "/dashboard/buyer";
          }

          return {
            id: `user-notif-${doc.id}`,
            title: titleText,
            description: descText,
            time: timeStr,
            type: data.type || "system",
            link: computedLink,
            read: data.read === true,
          } as NotificationItem;
        });

        setDirectNotifications(docs);
      },
      (error) => {
        console.warn("NotificationCenter: user_notifications listener skipped or missing indexes:", error);
      }
    );

    // 3. Fetch active global coupons
    const couponsQuery = query(
      collection(db, "coupons"),
      where("isActive", "==", true),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsubscribeCoupons = onSnapshot(
      couponsQuery,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          const timeStr = data.createdAt?.seconds
            ? new Date(data.createdAt.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : "Récemment";

          let discountDisplay = "";
          if (data.discountType === "percentage") {
            discountDisplay = `${data.discountValue}%`;
          } else {
            discountDisplay = `${data.discountValue} DA`;
          }

          return {
            id: `global-coupon-${doc.id}`,
            title: t("notification.new_coupon_title", "🎁 Nouveau Code Promo : {{code}}", { code: data.code }),
            description: t(
              "notification.new_coupon_desc",
              "Profitez de {{discount}} de réduction ! (Min. {{min}} DA)",
              { discount: discountDisplay, min: data.minOrderValue || 0 }
            ),
            time: timeStr,
            type: "coupon",
            link: "/shop",
            read: localStorage.getItem(`notif_read_global-coupon-${doc.id}`) === "true",
          } as NotificationItem;
        });
        setGlobalCoupons(docs);
      },
      (error) => {
        console.warn("NotificationCenter: coupons listener skipped", error);
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeDirect();
      unsubscribeCoupons();
    };
  }, [currentUser, lang, userProfile?.role, t]);

  // Combined notifications memo sorted chronologically
  const notifications = useMemo(() => {
    return [...directNotifications, ...orderNotifications, ...globalCoupons];
  }, [orderNotifications, directNotifications, globalCoupons]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markAllAsRead = async () => {
    // 1. Local storage read state for order updates and global coupons
    orderNotifications.forEach((n) => {
      localStorage.setItem(`notif_read_${n.id}`, "true");
    });
    globalCoupons.forEach((n) => {
      localStorage.setItem(`notif_read_${n.id}`, "true");
    });
    setOrderNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setGlobalCoupons((prev) => prev.map((n) => ({ ...n, read: true })));

    // 2. Update all unread direct notifications in Firestore
    const unreadDirect = directNotifications.filter((n) => !n.read);
    for (const notif of unreadDirect) {
      try {
        const docId = notif.id.replace("user-notif-", "");
        await updateDoc(doc(db, "user_notifications", docId), { read: true });
      } catch (err) {
        console.error("Could not update notification to read state in firestore:", err);
      }
    }
  };

  const markOneAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (id.startsWith("user-notif-")) {
      const docId = id.replace("user-notif-", "");
      try {
        await updateDoc(doc(db, "user_notifications", docId), { read: true });
      } catch (err) {
        console.error("Could not mark direct notification as read:", err);
      }
    } else {
      localStorage.setItem(`notif_read_${id}`, "true");
      setOrderNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setGlobalCoupons((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    setIsOpen(false);
    if (item.id.startsWith("user-notif-")) {
      const docId = item.id.replace("user-notif-", "");
      try {
        await updateDoc(doc(db, "user_notifications", docId), { read: true });
      } catch (err) {
        console.error("Could not mark clicked notification as read:", err);
      }
    } else {
      localStorage.setItem(`notif_read_${item.id}`, "true");
      setOrderNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      setGlobalCoupons((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
    }
    navigate(item.link);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageSquare className="w-4 h-4 text-orange-600" />;
      case "status_shipped":
        return <Truck className="w-4 h-4 text-amber-600" />;
      case "status_delivered":
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case "coupon":
        return <Ticket className="w-4 h-4 text-purple-600" />;
      case "new_order":
        return <Truck className="w-4 h-4 text-blue-600" />;
      case "dispute":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Bell className="w-4 h-4 text-[#121315]" />;
    }
  };

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full items-center justify-center bg-white/50 text-[#121315] border border-[#EBE5DF]/50 hover:bg-white transition-all active:scale-95 cursor-pointer relative flex group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={t("Notifications") || "Notifications"}
      >
        <Bell className="w-5 h-5 stroke-[2] text-[#121315]/70 group-hover:text-[#121315]" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-4 h-4 shrink-0"
            >
              <span className="absolute inline-flex w-full h-full rounded-full bg-[#F37021] opacity-75 animate-ping" />
              <span className="relative flex bg-[#F37021] text-white text-[9px] rtl:text-[11px] font-black w-4 h-4 rounded-full items-center justify-center border border-[#FAF8F5] shadow-sm">
                {unreadCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="absolute end-0 mt-3 w-80 sm:w-96 bg-[#FAF8F5]/95 backdrop-blur-2xl border border-[#EBE5DF] rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(30,67,86,0.15)] z-[100] overflow-hidden flex flex-col py-1"
          >
            <div className="px-6 py-4 border-b border-[#EBE5DF]/50 flex items-center justify-between bg-[#FAF8F5]/60 shrink-0">
              <div>
                <h4 className="font-extrabold text-[#121315] text-sm">{t("Notifications")}</h4>
                <p className="text-[9px] rtl:text-[11px] font-black uppercase text-[#F37021] tracking-widest rtl:tracking-normal mt-0.5">
                  {t("Mélodieux & Direct")}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-[9px] rtl:text-[11px] font-black uppercase tracking-wider rtl:tracking-normal text-[#121315] hover:text-[#F37021] bg-white border border-[#EBE5DF] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  {t("Tout lire (")}
                  {unreadCount})
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-[#EBE5DF]/30">
              {notifications.length === 0 ? (
                <div className="p-8 text-center space-y-4">
                  <div className="w-12 h-12 bg-white/50 border border-[#EBE5DF] rounded-full flex items-center justify-center mx-auto text-stone-400">
                    <Bell className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] rtl:text-[12px] font-black uppercase tracking-wider rtl:tracking-normal text-[#121315]/60">
                    {t("Aucune alerte")}
                  </p>
                </div>
              ) : (
                notifications.map((item) => {
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`flex gap-3.5 p-4 text-start transition-colors cursor-pointer select-none relative ${item.read ? "bg-transparent hover:bg-[#FAF8F5]/35" : "bg-[#F37021]/5 hover:bg-[#F37021]/8"}`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-white border border-[#EBE5DF]/40 flex items-center justify-center shrink-0 shadow-xs">
                        {getIcon(item.type)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-xs rtl:text-sm tracking-tight rtl:tracking-normal truncate leading-tight ${item.read ? "text-[#121315] font-bold" : "text-[#121315] font-extrabold"}`}
                          >
                            {item.title}
                          </p>
                          <span className="text-[8px] font-black uppercase tracking-wider rtl:tracking-normal text-stone-400 shrink-0 mt-0.5">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-stone-600 font-medium">{item.description}</p>
                      </div>

                      <div className="flex flex-col items-center justify-center shrink-0">
                        {!item.read ? (
                          <button
                            onClick={(e) => markOneAsRead(item.id, e)}
                            className="w-5 h-5 rounded-full hover:bg-[#F37021]/20 flex items-center justify-center transition-all bg-[#F37021]/10 shrink-0 cursor-pointer"
                            title={t("Marquer comme lu") || "Marquer comme lu"}
                          >
                            <Check className="w-3 h-3 text-[#F37021]" />
                          </button>
                        ) : (
                          <span className="w-1.5 h-1.5 bg-stone-300 rounded-full shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3.5 border-t border-[#EBE5DF]/50 bg-[#FAF8F5]/60 text-center shrink-0">
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate(
                    currentUser ? (userProfile?.role === "seller" ? "/dashboard/seller" : "/dashboard/buyer") : "/auth"
                  );
                }}
                className="text-[9px] rtl:text-[11px] font-black uppercase tracking-widest rtl:tracking-normal text-[#121315]/80 hover:text-[#121315] block w-full text-center py-2 cursor-pointer"
              >
                {t("navbar.seller_dashboard") || "Accéder au Tableau de Bord"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
