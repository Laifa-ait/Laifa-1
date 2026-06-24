# OLMART — Design System
## Source de verite pour la generation de composants et pages

---

## 1. Identite Visuelle

### Palette Principale

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#f97316` (orange-500) | Boutons principaux, badges, accents, CTA |
| `primary-hover` | `#ea580c` (orange-600) | Hover des boutons |
| `primary-light` | `#fff7ed` (orange-50) | Fonds de badges, alerts info |
| `secondary` | `#1e293b` (slate-800) | Texte principal, header, footer |
| `background` | `#f9f4e8` (warm cream) | Fond de page principal |
| `surface` | `#ffffff` (white) | Cartes, modals, dropdowns |
| `surface-alt` | `#f8fafc` (slate-50) | Sections alternees, tableaux |
| `text-primary` | `#0f172a` (slate-900) | Titres, texte important |
| `text-secondary` | `#475569` (slate-600) | Description, meta-texte |
| `text-muted` | `#94a3b8` (slate-400) | Placeholder, disabled |
| `border` | `#e2e8f0` (slate-200) | Bordures de cartes, inputs |
| `success` | `#22c55e` (green-500) | Succes, stock disponible |
| `warning` | `#f59e0b` (amber-500) | Attention, promo |
| `error` | `#ef4444` (red-500) | Erreur, rupture de stock |

### Gradients

```
hero-gradient: linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fbbf24 100%)
surface-gradient: linear-gradient(180deg, #ffffff 0%, #f9f4e8 100%)
dark-gradient: linear-gradient(180deg, #0f172a 0%, #1e293b 100%)
```

---

## 2. Typographie

### Police
- **Principale** : Système (font-sans) — `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont`
- **Accent** : Serif pour les titres hero — `font-serif` (Georgia, Cambria)
- **Chiffres** : Monospace pour les prix — `font-mono` (tabulaires)

### Echelle

| Token | Taille | Poids | Usage |
|-------|--------|-------|-------|
| `display` | 3rem (48px) | 800 | Hero titre, landing |
| `h1` | 2.25rem (36px) | 700 | Page titles |
| `h2` | 1.5rem (24px) | 600 | Section titles |
| `h3` | 1.25rem (20px) | 600 | Card titles, modals |
| `h4` | 1.125rem (18px) | 500 | Sous-sections |
| `body` | 0.875rem (14px) | 400 | Texte courant |
| `small` | 0.75rem (12px) | 400 | Meta, captions |
| `xs` | 0.625rem (10px) | 500 | Badges, tags |

---

## 3. Espacement

### Tokens

| Token | Valeur | Usage |
|-------|--------|-------|
| `space-xs` | 4px | Icon gaps, inline spacing |
| `space-sm` | 8px | Element padding |
| `space-md` | 16px | Card padding, form gaps |
| `space-lg` | 24px | Section gaps |
| `space-xl` | 32px | Between major sections |
| `space-2xl` | 48px | Page sections |
| `space-3xl` | 64px | Hero spacing |

### Rayons de Bordure

| Token | Valeur | Usage |
|-------|--------|-------|
| `radius-sm` | 6px | Badges, tags |
| `radius-md` | 10px | Boutons, inputs |
| `radius-lg` | 16px | Cartes, modals |
| `radius-xl` | 24px | Hero cards, banners |
| `radius-full` | 9999px | Avatars, FAB |

---

## 4. Composants

### Bouton Primaire
```
Classes Tailwind:
  bg-orange-500 hover:bg-orange-600 text-white
  font-semibold rounded-[10px] px-6 py-3
  transition-all duration-200 ease-out
  active:scale-[0.98] hover:shadow-lg hover:shadow-orange-500/25
  disabled:opacity-50 disabled:cursor-not-allowed
```

### Bouton Secondaire
```
Classes Tailwind:
  bg-white border border-slate-200 text-slate-800
  hover:bg-slate-50 hover:border-slate-300
  font-medium rounded-[10px] px-6 py-3
  transition-all duration-200
```

### Bouton Ghost
```
Classes Tailwind:
  bg-transparent text-slate-600
  hover:bg-slate-100 hover:text-slate-900
  font-medium rounded-[10px] px-4 py-2
  transition-colors duration-150
```

### Carte Produit
```
Classes Tailwind:
  bg-white rounded-2xl border border-slate-100
  shadow-sm hover:shadow-xl
  transition-all duration-300 ease-out
  hover:-translate-y-1
  overflow-hidden
```

Structure interne:
- Image: `aspect-square object-cover rounded-t-2xl`
- Contenu: `p-4 space-y-2`
- Nom: `text-sm font-semibold text-slate-900 line-clamp-2`
- Prix: `text-lg font-bold text-orange-500`
- Badge promo (si applicable): `absolute top-3 left-3 bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-full`

### Input
```
Classes Tailwind:
  w-full bg-white border border-slate-200
  rounded-[10px] px-4 py-3 text-sm text-slate-900
  placeholder:text-slate-400
  focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500
  transition-all duration-150
  disabled:bg-slate-50 disabled:text-slate-400
```

### Modal
```
Classes Tailwind:
  Overlay: fixed inset-0 bg-black/40 backdrop-blur-sm
  Container: fixed inset-0 flex items-center justify-center p-4
  Card: bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto
  Header: p-6 border-b border-slate-100 flex items-center justify-between
  Body: p-6
  Footer: p-6 border-t border-slate-100 flex justify-end gap-3
```

### Toast Notification
```
Classes Tailwind:
  fixed bottom-6 right-6 z-50
  bg-slate-900 text-white px-5 py-3 rounded-xl shadow-lg
  text-sm font-medium
  flex items-center gap-3
  Success: prefix avec CheckCircle2 (green-400)
  Error: prefix avec XCircle (red-400)
  Warning: prefix avec AlertTriangle (amber-400)
```

---

## 5. Layout

### Conteneur
```
max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
```

### Grille Produits
```
Mobile (default):  grid grid-cols-2 gap-3
Tablet (md):       md:grid-cols-3 md:gap-4
Desktop (lg):      lg:grid-cols-4 lg:gap-5
Large (xl):        xl:grid-cols-5 xl:gap-6
```

### Breakpoints
| Nom | Valeur | Usage |
|-----|--------|-------|
| `sm` | 640px | Petits ajustements |
| `md` | 768px | Tablette |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large |

---

## 6. Animations

### Hover — Carte Produit
```css
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
hover: transform: translateY(-4px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
```

### Hover — Bouton
```css
transition: all 0.2s ease-out;
active: transform: scale(0.98);
hover: box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.25);
```

### Entree — Modal
```css
animation: fadeIn 0.2s ease-out, slideUp 0.2s ease-out;
```

### Skeleton Loader
```
Classes Tailwind:
  animate-pulse bg-slate-200 rounded-lg
  Variantes: h-4 w-3/4 (text), h-40 w-full (image), h-10 w-full (button)
```

### Page Transition
```css
transition: opacity 0.15s ease-in-out;
```

---

## 7. Icons (Lucide React)

### Usage Standard
```tsx
import { ShoppingCart, Heart, Search, User, Menu } from 'lucide-react';

// Taille par defaut dans les boutons:
<Icon className="w-5 h-5" />

// Taille dans les badges/tags:
<Icon className="w-4 h-4" />

// Taille hero/illustration:
<Icon className="w-12 h-12" strokeWidth={1.5} />
```

### Iconographie par Contexte
| Contexte | Icone | Taille |
|----------|-------|--------|
| Panier | `ShoppingCart` | w-5 h-5 |
| Favoris | `Heart` | w-5 h-5 |
| Recherche | `Search` | w-5 h-5 |
| Compte | `User` | w-5 h-5 |
| Menu | `Menu` | w-6 h-6 |
| Livraison | `Truck` | w-5 h-5 |
| Support | `Headphones` | w-5 h-5 |
| Succes | `CheckCircle2` | w-5 h-5 |
| Erreur | `XCircle` | w-5 h-5 |
| Retour | `RotateCcw` | w-5 h-5 |

---

## 8. Patterns Specifiques OLMART

### Header / Navbar
```
- Hauteur: h-16 (64px)
- Fond: bg-[#f9f4e8]/80 backdrop-blur-md (translucide)
- Bordure: border-b border-slate-200/50
- Logo: Gauche, h-10
- Barre recherche: Centre, max-w-xl, rounded-full
- Actions: Droite (favoris, panier, compte)
- Mobile: Logo + Search icon + Menu hamburger
```

### Barre Top (announcement)
```
- Hauteur: h-8 (32px)
- Fond: bg-slate-900
- Texte: text-white text-xs font-medium text-center
- Defilant (marquee) pour les promotions
```

### Hero Section (Home)
```
- Hauteur: min-h-[60vh]
- Fond: hero-gradient (orange -> amber)
- Layout: 2 colonnes (texte gauche, image droite)
- Titre: font-serif text-4xl md:text-5xl font-bold text-white
- Sous-titre: text-white/80 text-lg
- CTA: bg-white text-orange-500 hover:bg-white/90 (bouton clair sur fond orange)
```

### Banniere Promo
```
Classes:
  relative overflow-hidden rounded-2xl
  bg-gradient-to-r from-orange-500 to-amber-400
  p-6 md:p-10
  text-white
```

### Badge Sponsoring
```
Classes:
  absolute top-3 right-3
  bg-amber-400 text-amber-900
  text-xs font-bold px-2 py-1 rounded-full
  flex items-center gap-1
```

### Section Categorie
```
Classes:
  bg-white rounded-2xl border border-slate-100
  p-6 hover:shadow-lg transition-shadow
  Icone: w-12 h-12 bg-orange-50 text-orange-500 rounded-xl p-2.5
  Nom: text-base font-semibold text-slate-900 mt-3
  Compte: text-sm text-slate-500
```

---

## 9. Formulaires

### Layout
```
- Espacement: space-y-4 entre les champs
- Label: text-sm font-medium text-slate-700 mb-1
- Input: voir composant Input ci-dessus
- Erreur: text-xs text-red-500 mt-1 avec icon AlertCircle
- Bouton submit: pleine largeur, w-full
```

### Validation Visuelle
| Etat | Bordure | Icone |
|------|---------|-------|
| Defaut | slate-200 | - |
| Focus | orange-500 | - |
| Valide | green-500 | CheckCircle (green) |
| Erreur | red-500 | AlertCircle (red) |
| Disabled | slate-200 | - |

---

## 10. Responsive Patterns

### Mobile-First
TOUT le CSS est mobile-first. Les breakpoints ajoutent des fonctionnalites, ne les retirent pas.

### Navigation Mobile
```
- Bottom nav bar: fixed bottom-0, h-16, 5 items
- Icones: w-6 h-6, labels: text-[10px]
- Active: text-orange-500
- Inactive: text-slate-400
```

### Drawer Mobile
```
- Slide depuis la droite: translate-x-full -> translate-x-0
- Largeur: w-80 max-w-[85vw]
- Fond overlay: bg-black/40 backdrop-blur-sm
- Animation: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
```

---

## 11. Variables CSS Globales (index.css)

Ajouter dans `src/index.css`:

```css
@theme {
  --color-primary: #f97316;
  --color-primary-hover: #ea580c;
  --color-primary-light: #fff7ed;
  --color-background: #f9f4e8;
  --color-surface: #ffffff;
  --color-surface-alt: #f8fafc;
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #94a3b8;
  --color-border: #e2e8f0;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --font-serif: Georgia, Cambria, "Times New Roman", Times, serif;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
}
```

---

## 12. Exemple Complet : Page Produit

```tsx
// Structure attendue pour une page produit generee par AI Studio
<section className="min-h-screen bg-[#f9f4e8]">
  {/* Breadcrumb */}
  <nav className="max-w-7xl mx-auto px-4 py-4 text-sm text-slate-500">
    Accueil / Categorie / Sous-categorie / <span className="text-slate-900">Nom Produit</span>
  </nav>

  <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-16">
    {/* Galerie Images */}
    <div className="space-y-4">
      <div className="aspect-square bg-white rounded-2xl overflow-hidden">
        <img src="..." className="w-full h-full object-cover" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {/* Thumbnails */}
      </div>
    </div>

    {/* Info Produit */}
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nom du Produit</h1>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center text-amber-400">
            {/* 5 etoiles */}
          </div>
          <span className="text-sm text-slate-500">(128 avis)</span>
        </div>
      </div>

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-orange-500">2,500 DA</span>
        <span className="text-lg text-slate-400 line-through">3,200 DA</span>
        <span className="bg-orange-100 text-orange-600 text-sm font-bold px-2 py-1 rounded-full">-22%</span>
      </div>

      {/* Variantes */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Couleur</h3>
        <div className="flex gap-2">
          <button className="w-10 h-10 rounded-full border-2 border-orange-500 ring-2 ring-orange-200" />
          <button className="w-10 h-10 rounded-full border border-slate-200" />
        </div>
      </div>

      {/* Quantite + CTA */}
      <div className="flex gap-3">
        <div className="flex items-center border border-slate-200 rounded-[10px]">
          <button className="px-3 py-2 text-slate-500 hover:text-slate-900">-</button>
          <span className="px-3 py-2 text-sm font-semibold w-10 text-center">1</span>
          <button className="px-3 py-2 text-slate-500 hover:text-slate-900">+</button>
        </div>
        <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-[10px] transition-all active:scale-[0.98]">
          Ajouter au panier
        </button>
        <button className="p-3 border border-slate-200 rounded-[10px] hover:bg-slate-50">
          <Heart className="w-5 h-5 text-slate-400" />
        </button>
      </div>
    </div>
  </div>
</section>
```

---

## 13. Regles ABSOLUES

1. **Jamais de couleurs hardcodees** — Utiliser TOUJOURS les tokens du design system
2. **Mobile-first** — Styles de base pour mobile, breakpoints pour desktop
3. **Transitions obligatoires** — Tout element interactif doit avoir une transition
4. **Espacement consistent** — Utiliser les tokens d'espacement, pas de valeurs arbitraires
5. **Lucide React uniquement** — Pas d'autres librairies d'icones
6. **Tailwind v4** — Utiliser `@theme` pour les customisations, pas de `tailwind.config.js`
7. **Framer Motion** — Pour les animations complexes (page transitions, gestes)
8. **Accessibilite** — Contraste minimum 4.5:1, focus visible, aria-labels
