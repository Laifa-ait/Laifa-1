# OLMART — Marketplace E-Commerce Multi-Vendeurs

Plateforme e-commerce destinée au marché algérien, couvrant les 58 wilayas.

## Stack Technique

- **Frontend :** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend :** Express.js + Firebase (Auth, Firestore, Storage)
- **AI :** Gemini 1.5 Flash
- **i18n :** Français, Arabe, Anglais

## Prérequis

- Node.js 20+
- npm 10+
- Compte Firebase

## Installation

```bash
npm install
```

## Configuration

```bash
cp .env.example .env
# Remplir les variables dans .env
```

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Démarrer en développement |
| `npm run build` | Build production |
| `npm start` | Démarrer en production |
| `npm test` | Lancer les tests |
| `npm run lint` | Vérifier les types |
| `npm run format` | Formater le code |

## Dépendances Serveur

**⚠️ ATTENTION : `firebase-admin` est présent dans les dependencies (et non devDependencies) car il est requis par le backend Express en production. Bien qu'il soit ignoré par Vite lors du build frontend, il alourdit l'installation de production. Ne jamais l'importer dans le code source React.**

## Architecture

```
src/
├── pages/Public/    # Storefront
├── pages/Seller/    # Dashboard vendeur
├── pages/Admin/     # Backoffice admin
├── components/      # Composants UI
├── context/         # Contextes React
├── hooks/           # Hooks personnalisés
├── routes/          # API endpoints
├── utils/           # Utilitaires
└── services/        # Services métier
```

## Sécurité
 
- RBAC (Admin / Vendeur / Acheteur)
- KYC vendeur avec modération
- Rate limiting sur les endpoints sensibles
- CSP et Helmet configurés
- Sanitization XSS

## Licence
UNLICENSED
