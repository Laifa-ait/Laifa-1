import { PRODUCT_HIERARCHY } from "../constants";

export const PRODUCT_COLORS = [
  { name: "Noir", hex: "#000000" },
  { name: "Blanc", hex: "#FFFFFF" },
  { name: "Gris", hex: "#6B7280" },
  { name: "Rouge", hex: "#EF4444" },
  { name: "Bleu", hex: "#3B82F6" },
  { name: "Vert", hex: "#10B981" },
  { name: "Jaune", hex: "#F59E0B" },
  { name: "Marron", hex: "#78350F" },
  { name: "Rose", hex: "#EC4899" },
  { name: "Violet", hex: "#8B5CF6" },
  { name: "Or", hex: "#D4AF37" },
  { name: "Argent", hex: "#C0C0C0" },
];

export const CATEGORIES = ["Tous", ...Object.keys(PRODUCT_HIERARCHY)];

export const ORDER_STEPS = [
  { status: "pending", label: "En attente" },
  { status: "confirmed", label: "Confirmée" },
  { status: "processing", label: "Préparation" },
  { status: "ready", label: "Prête" },
  { status: "shipped", label: "En livraison" },
  { status: "delivered", label: "Livrée" },
];

export const PRESET_AVATARS = [
  {
    id: "av_retro_afro",
    name: {
      fr: "Afro Groovy 70s",
      en: "Afro Groovy 70s",
      ar: "آفرو جروفي السبعينات",
    },
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="24" fill="#FEF3C7"/>
      <circle cx="60" cy="52" r="38" fill="#18181B"/>
      <circle cx="36" cy="60" r="22" fill="#18181B"/>
      <circle cx="84" cy="60" r="22" fill="#18181B"/>
      <circle cx="60" cy="32" r="24" fill="#18181B"/>
      <path d="M52,78 L68,78 L74,104 L46,104 Z" fill="#F59E0B"/>
      <path d="M34,104 L86,104 L74,86 L46,86 Z" fill="#EA580C"/>
      <path d="M46,86 L60,104 L74,86 L60,78 Z" fill="#FCD34D"/>
      <path d="M42,56 Q60,44 78,56 Q84,72 78,82 Q60,94 42,82 Q36,72 42,56" fill="#F3A37E"/>
      <path d="M52,74 Q60,80 68,74" stroke="#18181B" stroke-width="3" stroke-linecap="round" fill="none"/>
      <circle cx="57" cy="68" r="1.5" fill="#18181B"/>
      <circle cx="63" cy="68" r="1.5" fill="#18181B"/>
      <path d="M38,58 h18 v12 q0,6 -8,6 h-2 q-8,0 -8,-6 Z" fill="#EA580C" stroke="#18181B" stroke-width="2.5"/>
      <path d="M64,58 h18 v12 q0,6 -8,6 h-2 q-8,0 -8,-6 Z" fill="#EA580C" stroke="#18181B" stroke-width="2.5"/>
      <path d="M56,60 H64" stroke="#18181B" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "av_retro_bob",
    name: {
      fr: "Mod Queen 60s",
      en: "Mod Queen 60s",
      ar: "ملكة الستينات الأنيقة",
    },
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="24" fill="#FFE4E6"/>
      <path d="M26,60 C26,24 94,24 94,60 C94,84 90,84 84,84 C84,54 36,54 36,84 C30,84 26,84 26,60 Z" fill="#E11D48"/>
      <circle cx="34" cy="74" r="12" fill="#E11D48"/>
      <circle cx="86" cy="74" r="12" fill="#E11D48"/>
      <path d="M50,78 L70,78 L74,104 L46,104 Z" fill="#F43F5E"/>
      <path d="M32,104 L88,104 L74,86 L46,86 Z" fill="#FDA4AF"/>
      <path d="M42,54 Q60,42 78,54 Q84,70 78,80 Q60,92 42,80 Q36,70 42,54" fill="#F5C3B3"/>
      <path d="M26,45 Q60,25 94,45 C80,35 40,35 26,45" fill="#9F1239"/>
      <circle cx="46" cy="58" r="11" fill="#FFFFFF" stroke="#18181B" stroke-width="2.5"/>
      <circle cx="46" cy="58" r="7" fill="#18181B"/>
      <circle cx="74" cy="58" r="11" fill="#FFFFFF" stroke="#18181B" stroke-width="2.5"/>
      <circle cx="74" cy="58" r="7" fill="#18181B"/>
      <path d="M57,58 H63" stroke="#18181B" stroke-width="3"/>
      <path d="M50,75 Q60,82 70,75 Q60,78 50,75" fill="#E11D48" stroke="#18181B" stroke-width="2"/>
    </svg>`,
  },
  {
    id: "av_retro_moustache",
    name: {
      fr: "Funky Moustache 70s",
      en: "Funky Moustache 70s",
      ar: "شارب السبعينات جروفي",
    },
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="24" fill="#FFEDD5"/>
      <circle cx="60" cy="46" r="34" fill="#78350F"/>
      <circle cx="40" cy="56" r="16" fill="#78350F"/>
      <circle cx="80" cy="56" r="16" fill="#78350F"/>
      <circle cx="48" cy="36" r="18" fill="#78350F"/>
      <circle cx="72" cy="36" r="18" fill="#78350F"/>
      <path d="M52,78 L68,78 L74,104 L46,104 Z" fill="#16A34A"/>
      <path d="M30,104 L90,104 L74,86 L46,86 Z" fill="#15803D"/>
      <path d="M46,86 L60,104 L74,86 C60,94 60,84 46,86 Z" fill="#FDBA74"/>
      <path d="M42,56 Q60,44 78,56 Q84,72 78,82 Q60,94 42,82 Q36,72 42,56" fill="#E0A98F"/>
      <path d="M38,58 L54,55 L58,66 L42,68 Z" fill="#16A34A" fill-opacity="0.8" stroke="#78350F" stroke-width="2"/>
      <path d="M62,55 L78,58 L74,68 L58,66 Z" fill="#16A34A" fill-opacity="0.8" stroke="#78350F" stroke-width="2"/>
      <path d="M54,57 H62" stroke="#18181B" stroke-width="2.5"/>
      <path d="M46,73 Q60,62 74,73 Q68,78 60,75 Q52,78 46,73 Z" fill="#451A03" stroke="#18181B" stroke-width="1.5"/>
      <path d="M54,76 Q60,81 66,76" stroke="#451A03" stroke-width="1.5" fill="none"/>
    </svg>`,
  },
  {
    id: "av_retro_flower",
    name: {
      fr: "Flower Child 70s",
      en: "Flower Child 70s",
      ar: "طفل الورد السبعينات",
    },
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="24" fill="#F3E8FF"/>
      <path d="M24,54 C24,18 96,18 96,54 C96,94 88,104 88,104 L32,104 C32,104 24,94 24,54 Z" fill="#B45309"/>
      <path d="M42,54 Q60,42 78,54 Q84,70 78,80 Q60,92 42,80 Q36,70 42,54" fill="#F4B097"/>
      <path d="M26,45 Q60,32 94,45" stroke="#EC4899" stroke-width="7" fill="none"/>
      <circle cx="60" cy="38" r="4" fill="#F59E0B"/>
      <circle cx="56" cy="38" r="2.5" fill="#FFFFFF"/>
      <circle cx="64" cy="38" r="2.5" fill="#FFFFFF"/>
      <circle cx="60" cy="34" r="2.5" fill="#FFFFFF"/>
      <circle cx="60" cy="42" r="2.5" fill="#FFFFFF"/>
      <circle cx="48" cy="58" r="10" fill="#EC4899" fill-opacity="0.85" stroke="#18181B" stroke-width="2"/>
      <circle cx="72" cy="58" r="10" fill="#EC4899" fill-opacity="0.85" stroke="#18181B" stroke-width="2"/>
      <path d="M58,58 H62" stroke="#18181B" stroke-width="2.5"/>
      <path d="M34,104 L86,104 L74,86 L46,86 Z" fill="#EC4899"/>
      <path d="M46,86 L50,104 H34 Z" fill="#8B5CF6"/>
      <path d="M74,86 L70,104 H86 Z" fill="#8B5CF6"/>
      <path d="M52,74 Q60,79 68,74" stroke="#18181B" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    </svg>`,
  },
  {
    id: "av_retro_beatnik",
    name: {
      fr: "Cool Beatnik 60s",
      en: "Cool Beatnik 60s",
      ar: "بيتنيك الستينات الهادئ",
    },
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="24" fill="#E0F2FE"/>
      <path d="M32,56 C32,28 88,28 88,56 C88,80 84,94 80,94 L40,94 C36,94 32,80 32,56 Z" fill="#1E293B"/>
      <path d="M42,54 Q60,42 78,54 Q84,70 78,80 Q60,92 42,80 Q36,70 42,54" fill="#FAD1B8"/>
      <path d="M32,40 C32,24 88,24 88,40 Q60,32 32,40" fill="#0F172A"/>
      <rect x="58" y="20" width="4" height="6" fill="#0F172A"/>
      <circle cx="48" cy="58" r="9" fill="none" stroke="#0F172A" stroke-width="3"/>
      <circle cx="48" cy="58" r="2" fill="#0F172A"/>
      <circle cx="72" cy="58" r="9" fill="none" stroke="#0F172A" stroke-width="3"/>
      <circle cx="72" cy="58" r="2" fill="#0F172A"/>
      <path d="M57,58 H63" stroke="#0F172A" stroke-width="3"/>
      <path d="M32,104 L88,104 L74,86 L46,86 Z" fill="#F1F5F9"/>
      <path d="M32,94 H88" stroke="#3B82F6" stroke-width="4"/>
      <path d="M32,102 H88" stroke="#3B82F6" stroke-width="4"/>
      <path d="M52,73 Q60,77 68,73" stroke="#0F172A" stroke-width="2" stroke-linecap="round" fill="none"/>
    </svg>`,
  },
  {
    id: "av_retro_rocker",
    name: {
      fr: "Glam Rockstar 70s",
      en: "Glam Rockstar 70s",
      ar: "نجم جلام روك السبعينات",
    },
    svg: `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" rx="24" fill="#FFFBEB"/>
      <path d="M18,60 L24,40 L40,32 L60,18 L80,32 L96,40 L102,60 L92,84 L80,94 H40 L28,84 Z" fill="#D97706"/>
      <path d="M30,48 L36,32 L52,24 L68,24 L84,32 L90,48" stroke="#78350F" stroke-width="3" fill="none"/>
      <path d="M42,54 Q60,42 78,54 Q84,70 78,80 Q60,92 42,80 Q36,70 42,54" fill="#FCD34D"/>
      <path d="M40,36 L52,56 L44,58 L54,82 L42,80 L32,54 Z" fill="#3B82F6" fill-opacity="0.9"/>
      <path d="M38,36 L50,56 L42,58 L52,82" stroke="#EF4444" stroke-width="2.5" fill="none"/>
      <circle cx="48" cy="58" r="9" fill="#F59E0B" fill-opacity="0.6" stroke="#18181B" stroke-width="2"/>
      <circle cx="72" cy="58" r="9" fill="#F59E0B" fill-opacity="0.6" stroke="#18181B" stroke-width="2"/>
      <path d="M57,58 H63" stroke="#18181B" stroke-width="2"/>
      <path d="M32,104 L88,104 L74,86 L46,86 Z" fill="#9333EA"/>
      <path d="M46,86 L60,104 L74,86 Z" fill="#FEF3C7"/>
      <path d="M52,73 Q60,79 68,73" stroke="#18181B" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "av_jeunefille",
    name: {
      fr: "Jeune Fille (Yasmine)",
      en: "Young Girl (Yasmine)",
      ar: "الشابة ياسمين",
    },
    svg: `<svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Base Background Card -->
      <rect width="100" height="120" rx="16" fill="#FCECEC"/>
      <!-- Side Color Stripes -->
      <rect x="0" y="0" width="12" height="120" fill="#4B7A60"/>
      <rect x="88" y="0" width="12" height="120" fill="#E05B70"/>
      
      <!-- Character Torso (Pink) -->
      <path d="M22 120 C 22 104, 32 94, 50 94 C 68 94, 78 104, 78 120 Z" fill="#F472B6"/>
      <!-- Neck -->
      <rect x="46" y="80" width="8" height="20" fill="#F5C3B0"/>
      
      <!-- Hair Base (Wavy Brown) -->
      <path d="M28 55 C 22 35, 78 35, 72 55 C 68 95, 32 95, 28 55 Z" fill="#D97706" />
      <path d="M31 46 C 36 32, 64 32, 69 46" stroke="#B45309" stroke-width="6" stroke-linecap="round" fill="none" />
      
      <!-- Face -->
      <circle cx="50" cy="62" r="18" fill="#F9D4C7"/>
      
      <!-- Blush Cheeks -->
      <circle cx="40" cy="65" r="3" fill="#E85A71" opacity="0.4"/>
      <circle cx="60" cy="65" r="3" fill="#E85A71" opacity="0.4"/>
      
      <!-- Eyes & Brows -->
      <circle cx="43" cy="58" r="1.5" fill="#1C1B1B"/>
      <circle cx="57" cy="58" r="1.5" fill="#1C1B1B"/>
      <path d="M39 54 Q43 52, 47 54" stroke="#78350F" stroke-width="1" fill="none" stroke-linecap="round"/>
      <path d="M61 54 Q57 52, 53 54" stroke="#78350F" stroke-width="1" fill="none" stroke-linecap="round"/>
      
      <!-- Cute Smile -->
      <path d="M43 68 Q50 74, 57 68" fill="#FFFFFF" stroke="#D04255" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "av_jeune",
    name: {
      fr: "Jeune Homme (Amine)",
      en: "Young Man (Amine)",
      ar: "الشاب أمين",
    },
    svg: `<svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Base Background Card -->
      <rect width="100" height="120" rx="16" fill="#FDF4EC"/>
      <!-- Side Color Stripes -->
      <rect x="0" y="0" width="12" height="120" fill="#DE7223"/>
      <rect x="88" y="0" width="12" height="120" fill="#BD223B"/>
      
      <!-- Character Torso (White tee + Orange straps) -->
      <path d="M22 120 C 22 104, 32 95, 50 95 C 68 95, 78 104, 78 120 Z" fill="#F8FAFC"/>
      <path d="M34 95 L34 120" stroke="#C2410C" stroke-width="5" stroke-linecap="square"/>
      <path d="M66 95 L66 120" stroke="#C2410C" stroke-width="5" stroke-linecap="square"/>
      <rect x="31" y="112" width="38" height="8" fill="#C2410C" rx="2"/>
      
      <!-- Neck -->
      <rect x="46" y="80" width="8" height="20" fill="#EAC1AE"/>
      
      <!-- Hair -->
      <path d="M31 48 C 31 34, 69 34, 69 48 Z" fill="#2E1D10"/>
      <path d="M31 46 Q50 32, 69 38 L65 52 Q50 44, 35 52 Z" fill="#2E1D10"/>
      
      <!-- Face -->
      <circle cx="50" cy="62" r="18" fill="#EFCBB9"/>
      
      <!-- Blush Cheeks -->
      <circle cx="40" cy="65" r="3" fill="#DC2626" opacity="0.3"/>
      <circle cx="60" cy="65" r="3" fill="#DC2626" opacity="0.3"/>
      
      <!-- Eyes & Glasses -->
      <circle cx="42" cy="59" r="6" fill="none" stroke="#2E1D10" stroke-width="1.5"/>
      <circle cx="58" cy="59" r="6" fill="none" stroke="#2E1D10" stroke-width="1.5"/>
      <line x1="48" y1="59" x2="52" y2="59" stroke="#2E1D10" stroke-width="1.5"/>
      <circle cx="42" cy="59" r="1.5" fill="#1C1B1B"/>
      <circle cx="58" cy="59" r="1.5" fill="#1C1B1B"/>
      
      <!-- Happy Smile -->
      <path d="M46 69 Q50 71, 54 69" stroke="#2E1D10" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    </svg>`,
  },
  {
    id: "av_femme",
    name: {
      fr: "Femme (Meriem)",
      en: "Woman (Meriem)",
      ar: "المرأة مريم",
    },
    svg: `<svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Base Background Card -->
      <rect width="100" height="120" rx="16" fill="#F3EEFA"/>
      <!-- Side Color Stripes -->
      <rect x="0" y="0" width="12" height="120" fill="#6B21A8"/>
      <rect x="88" y="0" width="12" height="120" fill="#0D9488"/>
      
      <!-- Character Torso (Teal) -->
      <path d="M22 120 C 22 104, 32 94, 50 94 C 68 94, 78 104, 78 120 Z" fill="#0E7490"/>
      <path d="M50 94 L50 108" stroke="#F1F5F9" stroke-width="2" stroke-linecap="round"/>
      
      <!-- Neck -->
      <rect x="46" y="80" width="8" height="20" fill="#E9BCAB"/>
      
      <!-- Hair Back and Curls -->
      <path d="M30 52 C 24 38, 76 38, 70 52 C 64 92, 36 92, 30 52 Z" fill="#1C1917"/>
      <path d="M30 46 C 35 34, 65 34, 70 46" fill="#1C1917"/>
      <path d="M28 55 Q20 70, 26 82 Q30 85, 34 80" fill="#1C1917"/>
      <path d="M72 55 Q80 70, 74 82 Q70 85, 66 80" fill="#1C1917"/>
      
      <!-- Face -->
      <circle cx="50" cy="62" r="18" fill="#EEC4B2"/>
      
      <!-- Blush Cheeks -->
      <circle cx="40" cy="65" r="3" fill="#E11D48" opacity="0.3"/>
      <circle cx="60" cy="65" r="3" fill="#E11D48" opacity="0.3"/>
      
      <!-- Eyes & Brows -->
      <circle cx="43" cy="58" r="1.5" fill="#1C1B1B"/>
      <circle cx="57" cy="58" r="1.5" fill="#1C1B1B"/>
      
      <!-- Bright Open Smile -->
      <path d="M44 68 Q50 73, 56 68" fill="#FFFFFF" stroke="#BE123C" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "av_homme",
    name: {
      fr: "Homme (Farid)",
      en: "Man (Farid)",
      ar: "الرجل فريد",
    },
    svg: `<svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Base Background Card -->
      <rect width="100" height="120" rx="16" fill="#ECECF2"/>
      <!-- Side Color Stripes -->
      <rect x="0" y="0" width="12" height="120" fill="#1E3A8A"/>
      <rect x="88" y="0" width="12" height="120" fill="#78350F"/>
      
      <!-- Torso (Slate Sweatshirt) -->
      <path d="M22 120 C 22 104, 32 95, 50 95 C 68 95, 78 104, 78 120 Z" fill="#64748B"/>
      
      <!-- Neck -->
      <rect x="46" y="80" width="8" height="20" fill="#EAC1AE"/>
      
      <!-- Hair (Grey) -->
      <path d="M31 48 C 31 34, 69 34, 69 48 Z" fill="#78716C"/>
      <path d="M31 46 C 36 32, 64 32, 69 46 Q 73 52, 69 58" fill="#78716C"/>
      
      <!-- Face -->
      <circle cx="50" cy="62" r="18" fill="#EFCBB9"/>
      
      <!-- Beard & Mustache -->
      <path d="M32 58 C 30 76, 42 84, 50 84 C 58 84, 70 76, 68 58 C 66 62, 63 64, 50 64 C 37 64, 34 62, 32 58 Z" fill="#78716C"/>
      <path d="M43 66 Q50 72, 57 66" fill="#FFFFFF" stroke="#57534E" stroke-width="1.5"/>
      
      <!-- Blush -->
      <circle cx="40" cy="65" r="3" fill="#EA580C" opacity="0.3"/>
      <circle cx="60" cy="65" r="3" fill="#EA580C" opacity="0.3"/>
      
      <!-- Eyes & Smile Lines -->
      <circle cx="43" cy="56" r="1.5" fill="#1C1B1B"/>
      <circle cx="57" cy="56" r="1.5" fill="#1C1B1B"/>
      <path d="M39 52 Q43 51, 46 53" stroke="#57534E" stroke-width="1" fill="none"/>
      <path d="M61 52 Q57 51, 54 53" stroke="#57534E" stroke-width="1" fill="none"/>
    </svg>`,
  },
  {
    id: "av_vieille",
    name: {
      fr: "La Doyenne (Jida)",
      en: "Sweet Grandmother (Jida)",
      ar: "الجدة الفاضلة",
    },
    svg: `<svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Base Background Card -->
      <rect width="100" height="120" rx="16" fill="#FCECEF"/>
      <!-- Side Color Stripes -->
      <rect x="0" y="0" width="12" height="120" fill="#9F1239"/>
      <rect x="88" y="0" width="12" height="120" fill="#57534E"/>
      
      <!-- Torso (Lavender Shawl) -->
      <path d="M22 120 C 22 104, 32 94, 50 94 C 68 94, 78 104, 78 120 Z" fill="#7C3AED"/>
      <path d="M34 94 Q50 110, 66 94" stroke="#F1F5F9" stroke-width="2.5" fill="none"/>
      
      <!-- Neck -->
      <rect x="46" y="80" width="8" height="20" fill="#EBC4B2"/>
      
      <!-- Hair Bun Layer -->
      <path d="M31 48 C 31 34, 69 34, 69 48 Z" fill="#E5E7EB"/>
      <circle cx="50" cy="30" r="12" fill="#E5E7EB" stroke="#D1D5DB" stroke-width="1"/>
      <path d="M31 46 C 36 34, 64 34, 69 46 Q 71 52, 69 56" fill="#E5E7EB"/>
      
      <!-- Face -->
      <circle cx="50" cy="62" r="18" fill="#F0C9B7"/>
      
      <!-- Forehead Wisdome Wrinkles -->
      <path d="M43 49 Q50 47, 57 49" stroke="#A8A29E" stroke-width="1.25" fill="none" stroke-linecap="round"/>
      <path d="M44 52 Q50 50, 56 52" stroke="#A8A29E" stroke-width="1.25" fill="none" stroke-linecap="round"/>
      
      <!-- Blush Cheeks -->
      <circle cx="40" cy="65" r="3" fill="#E11D48" opacity="0.3"/>
      <circle cx="60" cy="65" r="3" fill="#E11D48" opacity="0.3"/>
      
      <!-- Eyes & Loving Brows -->
      <circle cx="43" cy="58" r="1.5" fill="#1D2939"/>
      <circle cx="57" cy="58" r="1.5" fill="#1D2939"/>
      <path d="M39 53 Q43 51, 46 54" stroke="#A8A29E" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M61 53 Q57 51, 54 54" stroke="#A8A29E" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      
      <!-- Warm Wise Smile -->
      <path d="M44 69 Q50 73, 56 69" stroke="#E11D48" stroke-width="1.75" fill="none" stroke-linecap="round"/>
    </svg>`,
  },
  {
    id: "av_vieux",
    name: {
      fr: "Le Sage (Chikh)",
      en: "Wise Grandfather (Chikh)",
      ar: "الشيخ الكبير",
    },
    svg: `<svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Base Background Card -->
      <rect width="100" height="120" rx="16" fill="#FAF4EB"/>
      <!-- Side Color Stripes -->
      <rect x="0" y="0" width="12" height="120" fill="#065F46"/>
      <rect x="88" y="0" width="12" height="120" fill="#7F1D1D"/>
      
      <!-- Torso (Ribbed Espresso Knit Sweater) -->
      <path d="M22 120 C 22 104, 32 94, 50 94 C 68 94, 78 104, 78 120 Z" fill="#451A03"/>
      <line x1="44" y1="94" x2="44" y2="104" stroke="#5C3F2B" stroke-width="1.5"/>
      <line x1="47" y1="94" x2="47" y2="105" stroke="#5C3F2B" stroke-width="1.5"/>
      <line x1="50" y1="94" x2="50" y2="106" stroke="#5C3F2B" stroke-width="1.5"/>
      <line x1="53" y1="94" x2="53" y2="105" stroke="#5C3F2B" stroke-width="1.5"/>
      <line x1="56" y1="94" x2="56" y2="104" stroke="#5C3F2B" stroke-width="1.5"/>
      
      <!-- Neck -->
      <rect x="46" y="80" width="8" height="20" fill="#EFCBB9"/>
      
      <!-- Balding hair sides -->
      <path d="M32 50 C 31 44, 33 40, 35 38" stroke="#D1D5DB" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M68 50 C 69 44, 67 40, 65 38" stroke="#D1D5DB" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      
      <!-- Face -->
      <circle cx="50" cy="62" r="18" fill="#F0C9B7"/>
      
      <!-- Forehead Wisdom lines -->
      <path d="M42 46 Q50 44, 58 46" stroke="#A8A29E" stroke-width="1.25" fill="none" stroke-linecap="round"/>
      <path d="M43 49 Q50 47, 57 49" stroke="#A8A29E" stroke-width="1.25" fill="none" stroke-linecap="round"/>
      
      <!-- Specs / Glasses -->
      <circle cx="42" cy="58" r="6.5" fill="none" stroke="#78350F" stroke-width="1.75"/>
      <circle cx="58" cy="58" r="6.5" fill="none" stroke="#78350F" stroke-width="1.75"/>
      <line x1="48.5" y1="58" x2="51.5" y2="58" stroke="#78350F" stroke-width="1.75"/>
      <circle cx="42" cy="58" r="1.5" fill="#1C1B1B"/>
      <circle cx="58" cy="58" r="1.5" fill="#1C1B1B"/>
      
      <!-- Thick Silver Beard -->
      <path d="M32 58 C 30 76, 40 86, 50 86 C 60 86, 70 76, 68 58 C 66 61, 62 63, 50 63 C 38 63, 34 61, 32 58 Z" fill="#E5E7EB" stroke="#D1D5DB" stroke-width="1"/>
      <path d="M38 62 Q50 66, 62 62" stroke="#D1D5DB" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M44 68 Q50 72, 56 68" stroke="#57534E" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      
      <!-- Soft Blush -->
      <circle cx="40" cy="65" r="3" fill="#D97706" opacity="0.35"/>
      <circle cx="60" cy="65" r="3" fill="#D97706" opacity="0.35"/>
    </svg>`,
  },
];

export const BUYER_ORDERS_PER_PAGE = 5;
export const CART_RESERVATION_MINUTES = 15;

