import React, { useState, useMemo } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Check, RefreshCw, Layers, CheckSquare, Square, Trash2 } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useTranslation } from "react-i18next";
import { PRODUCT_HIERARCHY } from '../../constants';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerPreferencesProps {
  currentUser: any;
  userProfile: any;
}

// Gorgeous Spotify-like vibrant theme palette coordinates
const THEME_COORDS: Record<string, { icon: string; from: string; to: string; text: string; glow: string; badge: string }> = {
  "Maison & Déco": { icon: "🛋️", from: "from-amber-400", to: "to-orange-500", text: "text-amber-600", glow: "rgba(245, 158, 11, 0.15)", badge: "bg-amber-50 text-amber-700 border-amber-100" },
  "Électronique": { icon: "📱", from: "from-blue-400", to: "to-indigo-600", text: "text-blue-600", glow: "rgba(59, 130, 246, 0.15)", badge: "bg-blue-50 text-blue-700 border-blue-100" },
  "Électroménager": { icon: "🍳", from: "from-purple-400", to: "to-pink-600", text: "text-purple-600", glow: "rgba(168, 85, 247, 0.15)", badge: "bg-purple-50 text-purple-700 border-purple-100" },
  "Mode": { icon: "👕", from: "from-emerald-400", to: "to-teal-600", text: "text-emerald-600", glow: "rgba(16, 185, 129, 0.15)", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  "Beauté & Santé": { icon: "✨", from: "from-rose-400", to: "to-red-500", text: "text-rose-600", glow: "rgba(244, 63, 94, 0.15)", badge: "bg-rose-50 text-rose-700 border-rose-100" },
  "Auto & Moto": { icon: "🚗", from: "from-red-550", to: "to-slate-700", text: "text-red-600", glow: "rgba(239, 68, 68, 0.15)", badge: "bg-red-50 text-red-700 border-red-100" },
  "Sport & Loisirs": { icon: "⚽", from: "from-sky-400", to: "to-blue-700", text: "text-sky-600", glow: "rgba(14, 165, 233, 0.15)", badge: "bg-sky-50 text-sky-700 border-sky-100" },
  "Bébé & Puériculture": { icon: "🧸", from: "from-pink-400", to: "to-indigo-550", text: "text-pink-650", glow: "rgba(236, 72, 153, 0.15)", badge: "bg-pink-50 text-pink-700 border-pink-100" },
  "Bricolage & Outillage": { icon: "🔧", from: "from-orange-400", to: "to-amber-600", text: "text-orange-650", glow: "rgba(249, 115, 22, 0.15)", badge: "bg-orange-50 text-orange-700 border-orange-100" },
  "Jeux & Jouets": { icon: "🎮", from: "from-cyan-400", to: "to-blue-600", text: "text-cyan-600", glow: "rgba(34, 211, 238, 0.15)", badge: "bg-cyan-50 text-cyan-700 border-cyan-100" },
  "Supermarché": { icon: "🛒", from: "from-lime-400", to: "to-emerald-600", text: "text-lime-600", glow: "rgba(163, 230, 53, 0.15)", badge: "bg-lime-50 text-lime-700 border-lime-100" },
  "Scolaire & Bureau": { icon: "📚", from: "from-violet-400", to: "to-fuchsia-600", text: "text-violet-600", glow: "rgba(139, 92, 246, 0.15)", badge: "bg-violet-50 text-violet-700 border-violet-100" }
};

// Precise high-quality localization dictionary
const TRANS_DICT: Record<string, { ar: string; fr: string }> = {
  "Maison & Déco": { ar: "البيت والديكور", fr: "Maison & Déco" },
  "Électronique": { ar: "الإلكترونيات", fr: "Électronique" },
  "Électroménager": { ar: "الأجهزة الكهرومنزليّة", fr: "Électroménager" },
  "Mode": { ar: "الموضة والأزياء", fr: "Mode & Vêtements" },
  "Beauté & Santé": { ar: "الجمال والعناية", fr: "Beauté & Santé" },
  "Auto & Moto": { ar: "السيارات والدراجات", fr: "Auto & Moto" },
  "Sport & Loisirs": { ar: "الرياضة والترفيه", fr: "Sport & Loisirs" },
  "Bébé & Puériculture": { ar: "الرضيع والأمومة", fr: "Bébé & Puériculture" },
  "Bricolage & Outillage": { ar: "الجهد والعتاد", fr: "Bricolage & Outillage" },
  "Jeux & Jouets": { ar: "الألعاب والترفيه للأطفال", fr: "Jeux & Jouets" },
  "Supermarché": { ar: "السوبرماركت والمواد الغذائية", fr: "Supermarché" },
  "Scolaire & Bureau": { ar: "الأدوات المدرسية والمكتب", fr: "Scolaire & Bureau" },
  
  // Bricolage & Outillage Subcategories
  "Outillage électroportatif": { ar: "أدوات كهربائية محمولة", fr: "Outillage électroportable" },
  "Outillage à main": { ar: "أدوات يدوية", fr: "Outillage à main" },
  "Menuiserie": { ar: "النجارة والمنتجات الخشبية", fr: "Menuiserie" },
  "Peinture & Droguerie": { ar: "الدهان والتجهيزات", fr: "Peinture & Droguerie" },
  "Électricité": { ar: "لوازم الكهرباء وتمديدات", fr: "Électricité" },
  "Plomberie & Sanitaire": { ar: "السباكة والتطهير الصحي", fr: "Plomberie & Sanitaire" },
  "Jardinage": { ar: "أدوات ومستلزمات الحدائق", fr: "Jardinage" },

  // Jeux & Jouets Subcategories
  "Jeux de société": { ar: "ألعاب الطاولة والورق", fr: "Jeux de société" },
  "Jeux d'extérieur": { ar: "ألعاب الهواء الطلق", fr: "Jeux d'extérieur" },
  "Jeux éducatifs": { ar: "ألعاب تعليمية وتثقيفية", fr: "Jeux éducatifs" },
  "Jeux de rôle & Déguisements": { ar: "ألعاب التقمص والأزياء المدرسية", fr: "Jeux de rôle" },
  "Figurines & Collections": { ar: "المجسمات والمجموعات الفريدة", fr: "Figurines & Collections" },
  "Poupées & Peluches": { ar: "الدمى والألعاب المحشوة", fr: "Poupées & Peluches" },
  "Véhicules enfants": { ar: "مركبات الأطفال والتروتينات", fr: "Véhicules enfants" },

  // Supermarché Subcategories
  "Hygiène & Beauté": { ar: "النظافة والعناية الشخصية", fr: "Hygiène & Beauté" },
  "Entretien de la maison": { ar: "منتجات التنظيف وصيانة المنزل", fr: "Entretien de la maison" },

  // Scolaire & Bureau Subcategories
  "Rentrée Scolaire": { ar: "لوازم الدخول المدرسي والقرطاسية", fr: "Rentrée Scolaire" },
  "Sacs & Cartables": { ar: "المحافظ والحقائب المدرسية", fr: "Sacs & Cartables" },
  "Papeterie & Bureau": { ar: "الأدوات والمستلزمات المكتبية", fr: "Papeterie & Bureau" },
  "Livres & Romans": { ar: "الكتب والروايات والقصص", fr: "Livres & Romans" },
  "Parascolaire Primaire": { ar: "الكتب الخارجية للابتدائي", fr: "Parascolaire Primaire" },
  "Parascolaire Moyen": { ar: "الكتب الخارجية للمتوسط", fr: "Parascolaire Moyen" },
  "Parascolaire Secondaire": { ar: "الكتب الخارجية للثانوي والباكالوريا", fr: "Parascolaire Secondaire" },
  
  // Maison & Déco Subcategories
  "Mobilier de Salon": { ar: "أثاث الصالون", fr: "Mobilier de Salon" },
  "Mobilier de Chambre": { ar: "أثاث غرف النوم", fr: "Mobilier de Chambre" },
  "Mobilier de Cuisine & Salle à manger": { ar: "أثاث المطبخ وغرفة الطعام", fr: "Mobilier de Cuisine" },
  "Décoration d'intérieur": { ar: "الديكور الداخلي", fr: "Décoration d'intérieur" },
  "Luminaires & Éclairage": { ar: "الإنارة والإضاءة", fr: "Luminaires & Éclairage" },
  "Linge de Maison & Textile": { ar: "أقمشة ومفروشات المنزل", fr: "Linge de Maison" },
  "Cuisine & Arts de la table": { ar: "أواني ومستلزمات المطبخ", fr: "Cuisine & Table" },
  "Salle de bain & WC": { ar: "مستلزمات الحمام", fr: "Salle de bain" },
  "Jardin, Terrasse & Balcon": { ar: "الحدائق والترّاس", fr: "Jardin & Terrasse" },
  "Rangement & Entretien": { ar: "التخزين والترتيب", fr: "Rangement & Entretien" },

  // Électronique Subcategories
  "Smartphones & Téléphones": { ar: "الهواتف الذكية", fr: "Smartphones" },
  "Accessoires Téléphonie": { ar: "إكسسوارات الهواتف", fr: "Accessoires Téléphone" },
  "Ordinateurs & PC": { ar: "الحواسيب والكمبيوتر", fr: "Ordinateurs & PC" },
  "Tablettes & Liseuses": { ar: "الأجهزة اللوحية", fr: "Tablettes & Liseuses" },
  "Périphériques Informatiques": { ar: "ملحقات الإعلام الآلي", fr: "Périphériques" },
  "TV & Home Cinéma": { ar: "التلفزيونات والسينما المنزلية", fr: "TV & Home Cinéma" },
  "Audio & Casques": { ar: "السماعات والصوتيات", fr: "Audio & Casques" },
  "Photo & Vidéo": { ar: "الكاميرات والتصوير", fr: "Photo & Vidéo" },
  "Consoles & Gaming": { ar: "الألعاب والجيمنج", fr: "Consoles & Gaming" },
  "Composants & Stockage": { ar: "المكونات والتخزين", fr: "Composants & Stockage" },
  "Objets Connectés": { ar: "الأجهزة المتصلة", fr: "Smart Gadgets" },

  // Électroménager Subcategories
  "Froid": { ar: "التبريد والثلاجات", fr: "Réfrigérateurs & Froid" },
  "Lavage": { ar: "الغسيل والتنظيف", fr: "Lavage & Nettoyage" },
  "Cuisson": { ar: "الطبخ والأفران", fr: "Cuisson & Fours" },
  "Petit Déjeuner & Café": { ar: "أجهزة الفطور والقهوة", fr: "Petit Déjeuner" },
  "Préparation Culinaire": { ar: "تحضير الطعام", fr: "Préparation Culinaire" },
  "Cuisson Conviviale": { ar: "أجهزة الطهي السريع", fr: "Cuisson Conviviale" },
  "Entretien des Sols": { ar: "مكانس كهربائية", fr: "Entretien Sols" },
  "Climatisation & Traitement de l'air": { ar: "مكيفات ومعالجة الهواء", fr: "Climatisation" },
  "Entretien du linge": { ar: "عناية بالملابس", fr: "Entretien linge" },

  // Mode Subcategories
  "Femme": { ar: "ملابس نسائية", fr: "Vêtements Femme" },
  "Homme": { ar: "ملابس رجالية", fr: "Vêtements Homme" },
  "Enfant": { ar: "ملابس الأطفال", fr: "Vêtements Enfant" },
  "Chaussures Femme": { ar: "أحذية نسائية", fr: "Chaussures Femme" },
  "Chaussures Homme": { ar: "أحذية رجالية", fr: "Chaussures Homme" },
  "Accessoires & Bijoux": { ar: "إكسسوارات ومجوهرات", fr: "Bijoux & Accessoires" },
  "Sportswear": { ar: "ملابس رياضية", fr: "Sportswear" },

  // Beauté & Santé Subcategories
  "Soins du visage": { ar: "العناية بالوجه", fr: "Soins du visage" },
  "Maquillage": { ar: "المكياج والتجميل", fr: "Maquillage" },
  "Parfums": { ar: "العطور الفاخرة", fr: "Parfums" },
  "Soins corporels": { ar: "العناية بالجسم", fr: "Soins corporels" },
  "Cheveux": { ar: "العناية بالشعر", fr: "Cheveux" },
  "Hygiène bucco-dentaire": { ar: "العناية بالفم", fr: "Hygiène Bucco" },
  "Santé & Bien-être": { ar: "الصحة والرفاهية", fr: "Santé & Bien-être" },
  "Appareils beauté": { ar: "أجهزة التجميل", fr: "Appareils Beauté" },

  // Auto & Moto
  "Accessoires auto": { ar: "إكسسوارات السيارات", fr: "Acc. Auto" },
  "Entretien & Mécanique": { ar: "الصيانة والميكانيك", fr: "Mécanique auto" },
  "Électronique auto": { ar: "إلكترونيات السيارات", fr: "Électronique auto" },
  "Carrosserie & Peinture": { ar: "الهيكل والطلاء", fr: "Carrosserie" },
  "Moto & Scooter": { ar: "الدراجات النارية", fr: "Moto & Scooter" },
  "Nettoyage auto": { ar: "تنظيف السيارات", fr: "Nettoyage auto" },

  // Sport & Loisirs
  "Fitness & Musculation": { ar: "اللياقة البدنية", fr: "Fitness & Musculation" },
  "Sports collectifs": { ar: "الرياضات الجماعية", fr: "Sports collectifs" },
  "Sports de raquette": { ar: "رياضات المضرب", fr: "Sports de raquette" },
  "Sports d'extérieur": { ar: "التخييم والمغامرة", fr: "Sports d'extérieur" },
  "Natation & Plage": { ar: "السباحة والشاطئ", fr: "Natation & Plage" },
  "Arts & Loisirs créatifs": { ar: "الفنون والأعمال اليدوية", fr: "Arts & Loisirs" },
  "Musique & Instruments": { ar: "الآلات الموسيقية", fr: "Instruments Musique" },

  // Bébé & Puériculture
  "Vêtements bébé": { ar: "ملابس الرضع", fr: "Vêtements bébé" },
  "Couches & Hygiène": { ar: "حفاضات ونظافة الرضع", fr: "Couches & Hygiène" },
  "Alimentation bébé": { ar: "تغذية الرضيع", fr: "Alimentation bébé" },
  "Poussettes & Sièges auto": { ar: "عربات وكراسي السيارات", fr: "Poussettes & Sièges" },
  "Chambre bébé": { ar: "غرف نوم الرضع", fr: "Chambre bébé" },
  "Sécurité & Surveillance": { ar: "الحماية والمراقبة", fr: "Sécurité bébé" },
  "Jouets bébé": { ar: "ألعاب الرضع", fr: "Jouets bébé" }
};

export const CustomerPreferences: React.FC<CustomerPreferencesProps> = ({ currentUser, userProfile }) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar' || i18n.language?.startsWith('ar');

  // Load existing preferences safely
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => {
    return userProfile?.preferences?.interests || [];
  });
  
  // Track which parent category has its accordion tray expanded
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  // Local Arabic/French translator
  const translateKey = (key: string) => {
    const translation = TRANS_DICT[key];
    if (translation) {
      return isArabic ? translation.ar : translation.fr;
    }
    return t(key);
  };

  // Compile map of parent categories and their direct subcategories (no sub-sub-categories!)
  const categoryStructure = useMemo<Record<string, string[]>>(() => {
    const data: Record<string, string[]> = {};
    Object.entries(PRODUCT_HIERARCHY).forEach(([parentCat, subObj]) => {
      data[parentCat] = Object.keys(subObj);
    });
    return data;
  }, []);

  const handleToggleSubcategory = (subName: string) => {
    setSelectedInterests(prev => 
      prev.includes(subName) 
        ? prev.filter(item => item !== subName)
        : [...prev, subName]
    );
  };

  // Click on parent category card:
  // 1. Toggles expansion of its child subcategories tray list
  // 2. Selects / Deselects all subcategories of this parent simultaneously!
  const handleToggleParentBlock = (parentCat: string) => {
    const childrenList = categoryStructure[parentCat] || [];
    const allChildrenSelected = childrenList.every(sub => selectedInterests.includes(sub));

    if (allChildrenSelected) {
      // De-select all subcategories under this parent
      setSelectedInterests(prev => prev.filter(sub => !childrenList.includes(sub)));
      toast.success(
        isArabic 
          ? `تم إلغاء اختيار جميع الفئات الفرعية لـ ${translateKey(parentCat)}` 
          : `Toutes les sous-catégories de ${translateKey(parentCat)} ont été retirées`
      );
    } else {
      // Select all subcategories under this parent
      setSelectedInterests(prev => {
        const updated = new Set([...prev, ...childrenList]);
        return Array.from(updated);
      });
      toast.success(
        isArabic 
          ? `تم اختيار كل الفئات الفرعية لـ ${translateKey(parentCat)}` 
          : `Sélection complète activée pour ${translateKey(parentCat)}`
      );
    }

    // Always automatically open the tray to show details cleanly!
    setExpandedCategories(prev => ({
      ...prev,
      [parentCat]: true // Keep open so they see the subcategories immediately
    }));
  };

  // Simple expand/collapse toggle without touching selection
  const handleToggleAccordion = (parentCat: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent triggering parent block toggle selection
    setExpandedCategories(prev => ({
      ...prev,
      [parentCat]: !prev[parentCat]
    }));
  };

  const clearAllSelected = () => {
    setSelectedInterests([]);
    toast.success(isArabic ? "تم تفريغ قائمة الاهتمامات !" : "Toutes les préférences ont été réinitialisées.");
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) {
      toast.error(isArabic ? "يرجى تسجيل الدخول أولاً." : "Veuillez vous authentifier.");
      return;
    }

    setSaving(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        preferences: {
          interests: selectedInterests,
          updatedAt: new Date().toISOString()
        }
      });
      toast.success(
        isArabic 
          ? "🎯 تم تحديث تفضيلاتك الذكية على أولمارت بنجاح !" 
          : "🎯 Vos préférences d'intérêts intuitives ont été synchronisées avec succès !"
      );
    } catch (err: any) {
      console.error(err);
      toast.error(isArabic ? "حدث خطأ أثناء الحفظ." : "Erreur d'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8" id="progressive-disclosure-preferences">
      
      {/* Immersive Dark Spotify Premium Banner */}
      <div className="relative overflow-hidden bg-zinc-950 text-white rounded-[2rem] p-8 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/20 to-orange-600/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-12 w-60 h-60 bg-gradient-to-tr from-rose-500/15 to-purple-600/10 rounded-full blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/35 rounded-full text-amber-400 text-[10px] font-black tracking-widest uppercase mb-1">
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>{isArabic ? "إعدادات الأسلوب المخصص" : "ENGAGEMENT PERSONNALISÉ"}</span>
            </div>
            
            <h3 className="font-extrabold text-3xl sm:text-4.5xl tracking-tight text-white leading-tight">
              {isArabic ? "اختر اهتماماتك المفضلة" : "Mes Thèmes & Préférences"}
            </h3>
            <p className="text-zinc-350 text-xs sm:text-sm font-medium leading-relaxed">
              {isArabic 
                ? "انقر على الفئة الكبرى لاختيارها كلها، ستفتح لك قائمة فريدة لتعديل واختيار عناصر فرعية معينة بكل مرونة وبطريقة مسلية !"
                : "Sélectionnez directement une thématique majeure pour l'activer, puis affinez vos réglages en cochant les sous-catégories de votre choix."}
            </p>
          </div>

          {/* Real-time stats pill */}
          <div className="flex items-center md:flex-col gap-3 justify-end flex-shrink-0 bg-zinc-900/70 backdrop-blur border border-zinc-850 px-5 py-4 rounded-2xl">
            <div className="text-start md:text-center">
              <span className="block text-[10px] font-black text-zinc-400 tracking-wider">
                {isArabic ? "الفئات الفرعية النشطة" : "SÉLECTIONNÉES"}
              </span>
              <span className="block text-2xl font-black text-amber-400 mt-0.5">
                {selectedInterests.length}
              </span>
            </div>
            {selectedInterests.length > 0 && (
              <button
                type="button"
                onClick={clearAllSelected}
                className="text-xs font-bold text-red-400 hover:text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-xl transition-all"
              >
                {isArabic ? "مسح الكل" : "Tout effacer"}
              </button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-6">
        
        {/* Accordions Matrix Container */}
        <div className="space-y-4" id="spotify-accordion-parent-grid">
          {Object.keys(categoryStructure).map((parentCat) => {
            const subcategories = categoryStructure[parentCat] || [];
            const style = THEME_COORDS[parentCat] || { icon: "📦", from: "from-zinc-400", to: "to-zinc-500", text: "text-zinc-600", glow: "rgba(0,0,0,0.02)", badge: "bg-zinc-50 border-zinc-100" };
            const isExpanded = !!expandedCategories[parentCat];
            
            // Count active subcategories in this parent block
            const selectedChildrenCount = subcategories.filter(sub => selectedInterests.includes(sub)).length;
            const allChildrenSelected = selectedChildrenCount === subcategories.length && subcategories.length > 0;
            const hasDraftSelections = selectedChildrenCount > 0;

            return (
              <div 
                key={parentCat}
                className={`bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-350 ${
                  hasDraftSelections ? 'border-zinc-900 ring-1 ring-zinc-900/5' : 'border-zinc-100'
                }`}
                id={`pref-accordion-[${parentCat}]`}
              >
                
                {/* Accordion Trigger Hero Card Bar */}
                <div 
                  onClick={() => handleToggleParentBlock(parentCat)}
                  className="flex items-center justify-between p-5 md:p-6 cursor-pointer select-none relative"
                >
                  
                  {/* Dynamic subtle accent background if elements inside are selected */}
                  {hasDraftSelections && (
                    <div className="absolute inset-0 bg-zinc-50/40 pointer-events-none" />
                  )}

                  <div className="relative z-10 flex items-center gap-4 flex-1 min-w-0">
                    
                    {/* Multi-layered custom visual badge */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-sm bg-gradient-to-tr ${
                      allChildrenSelected ? `${style.from} ${style.to} text-white` : 'bg-zinc-50 border border-zinc-150/60'
                    }`}>
                      {style.icon}
                    </div>

                    <div className="min-w-0 pr-2 rtl:pr-0 rtl:pl-2 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-base md:text-lg text-zinc-950 tracking-tight">
                          {translateKey(parentCat)}
                        </span>
                        
                        {/* Selections indicators badge */}
                        {hasDraftSelections && (
                          <span className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full border ${
                            allChildrenSelected ? 'bg-amber-100/70 text-amber-900 border-amber-200' : 'bg-zinc-100 text-zinc-700 border-zinc-200/50'
                          }`}>
                            {allChildrenSelected 
                              ? (isArabic ? "الكل مفعّل" : "Tous activés") 
                              : (isArabic ? `${selectedChildrenCount} من ${subcategories.length}` : `${selectedChildrenCount} sélectionnés`)}
                          </span>
                        )}
                      </div>
                      
                      <span className="block text-xs font-bold text-zinc-400">
                        {subcategories.length} {isArabic ? "خيارات فرعية مدرجة" : "choix de thématiques disponibles"}
                      </span>
                    </div>

                  </div>

                  {/* Right Tools Controls Panel */}
                  <div className="relative z-10 flex items-center gap-3">
                    
                    {/* Instant Choice status check box */}
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                      hasDraftSelections 
                        ? (allChildrenSelected ? 'bg-zinc-950 text-white' : 'bg-zinc-200 text-zinc-800')
                        : 'border-2 border-zinc-200 text-transparent hover:border-zinc-400'
                    }`}>
                      <Check className="w-4 h-4 stroke-[3px]" />
                    </div>

                    <div className="w-px h-6 bg-zinc-150" />

                    {/* Expand accordion toggler */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleAccordion(parentCat, e)}
                      className="p-2 bg-zinc-50 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 rounded-xl transition-colors"
                      title={isArabic ? "توسيع / إغلاق" : "Voir les détails"}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                  </div>

                </div>

                {/* Smooth Animated Tray for Subcategory Pills Grid (Spotify selector!) */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="border-t border-zinc-100"
                    >
                      <div className="bg-zinc-50/70 p-5 md:p-6 space-y-4">
                        
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
                            {isArabic 
                              ? `تخصيص الفئات الفرعية لـ ${translateKey(parentCat)} :` 
                              : `Affiner les rubriques de ${translateKey(parentCat)} :`}
                          </p>
                          
                          {/* Inner switch buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = new Set([...selectedInterests, ...subcategories]);
                                setSelectedInterests(Array.from(updated));
                              }}
                              className="text-[10px] font-bold text-zinc-600 hover:text-zinc-950 flex items-center gap-1"
                            >
                              <CheckSquare className="w-3 h-3 text-emerald-600" />
                              {isArabic ? "تفعيل الكل" : "Activer tout"}
                            </button>
                            <span className="text-zinc-300 text-xs">|</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInterests(prev => prev.filter(sub => !subcategories.includes(sub)));
                              }}
                              className="text-[10px] font-bold text-zinc-600 hover:text-red-600 flex items-center gap-1"
                            >
                              <Square className="w-3 h-3 text-red-500" />
                              {isArabic ? "تعطيل الكل" : "Désactiver tout"}
                            </button>
                          </div>
                        </div>

                        {/* Staggered Spotify Round Circular Pills Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                          {subcategories.map(subName => {
                            const isSubSelected = selectedInterests.includes(subName);
                            return (
                              <motion.button
                                key={subName}
                                type="button"
                                whileHover={{ scale: 1.025 }}
                                whileTap={{ scale: 0.975 }}
                                onClick={(e) => {
                                  e.stopPropagation(); // prevent collapsing or parent trigger
                                  handleToggleSubcategory(subName);
                                }}
                                className={`flex items-center justify-between px-4 py-3 rounded-2xl border text-start transition-all duration-200 ${
                                  isSubSelected
                                    ? `bg-gradient-to-br ${style.from} ${style.to} border-transparent text-white shadow-sm shadow-orange-100`
                                    : 'bg-white border-zinc-150 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                                }`}
                                id={`pref-pill-[${subName}]`}
                              >
                                <span className="font-extrabold text-xs sm:text-sm truncate mr-2 rtl:mr-0 rtl:ml-2">
                                  {translateKey(subName)}
                                </span>

                                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isSubSelected ? 'bg-white text-zinc-950' : 'border border-zinc-300 bg-transparent'
                                }`}>
                                  {isSubSelected && <Check className="w-3 h-3 stroke-[3px]" />}
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            );
          })}
        </div>

        {/* Dynamic Sticky Bottom Options Board */}
        <div className="bg-white border border-zinc-150 shadow-xl rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-4 z-40">
          <div className="text-start">
            <span className="block text-[10px] font-black text-zinc-400 tracking-wider">
              {isArabic ? "تقييم التخصيص التلقائي :" : "MOTEUR D'AFFINITÉ"}
            </span>
            <span className="text-xs font-extrabold text-zinc-700">
              {selectedInterests.length > 0 
                ? (isArabic ? `لقد قمت بتخصيص ${selectedInterests.length} فئة فرعية مفضلة.` : `Personnalisation ajustée avec ${selectedInterests.length} préférences.`)
                : (isArabic ? "لم تقم بتحديد أي فئات بعد، سيتم عرض المحتوى العام." : "Sélectionnez au moins une rubrique pour booster l'algorithme.")}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 px-8 py-3.5 bg-zinc-950 hover:bg-zinc-900 text-white font-extrabold text-xs tracking-widest uppercase rounded-full transition-all disabled:opacity-50 min-h-[48px]"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Check className="w-4 h-4 text-amber-400 stroke-[3px]" />
              )}
              <span>{saving ? (isArabic ? "جاري التحديث..." : "Mise à jour...") : (isArabic ? "حفظ التفضيلات" : "Enregistrer")}</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};
