# 🛒 MANUEL GÉNÉRAL DE GESTION ET ARCHITECTURE D'OLMART
> **Plateforme E-Commerce Multi-Vendeurs Premium pour le Marché Algérien**
> *Rédigé par le Développeur Full-Stack Senior & Expert DevSecOps OLMART.*

---

## 📌 TABLE DES MATIÈRES
1. [Introduction et Philosophie d'OLMART](#1-introduction-et-philosophie-dolmart)
2. [Sécurité et Protocoles de transaction (DevSecOps)](#2-sécurité-et-protocoles-de-transaction-devsecops)
3. [Le Storefront Public (Côté Client)](#3-le-storefront-public-côté-client)
4. [Le Tableau de Bord Vendeur (Vendor Dashboard)](#4-le-tableau-de-bord-vendeur-vendor-dashboard)
5. [Le Panneau d'Administration Principal (Admin Dashboard)](#5-le-panneau-dadministration-principal-admin-dashboard)
6. [Fonctionnement du Sponsoring des Produits (Détails Vendeur)](#6-fonctionnement-du-sponsoring-des-produits-détails-vendeur)
7. [Logistique Algérienne : Les 58 Wilayas et Livraison](#7-logistique-algérienne-les-58-wilayas-et-livraison)
8. [Guide de Démarrage Rapide pour l'Administrateur](#8-guide-de-démarrage-rapide-pour-ladministrateur)

---

## 1. INTRODUCTION ET PHILOSOPHIE D'OLMART

**OLMART (Olma Marketplace)** est une plateforme e-commerce multi-vendeurs de dernière génération conçue spécifiquement pour adresser les défis et opportunités du marché algérien.

### Principes Clés :
*   **Mobile-First Absolu :** L'interface utilisateur est entièrement pensée comme une application native haut de vue avec sa barre de navigation inférieure fixe (*Bottom Navigation Bar*), des transitions fluides, et une ergonomie tactile réactive.
*   **Identité Visuelle Texturée :** Palette chromatique beige sable et blanc immaculé donnant un aspect moderne et épuré, contrasté par un orange vif chaleureux pour les boutons d'engagement.
*   **Souveraineté des données d'OLMART :** Étant donné les contraintes d'usurpation et de sécurité, **toutes** les interactions (ventes, litiges, négociations, alertes) s'effectuent via les canaux internes intégrés. Aucun bypass par des messageries externes (WhatsApp, etc.) n'est autorisé afin de garantir l'intégrité de l'arbitrage financier en cas de problème.

---

## 2. SÉCURITÉ ET PROTOCOLES DE TRANSACTION (DEVSECOPS)

La plateforme repose sur une architecture Cloud sécurisée combinant **React**, **Vite** et la suite **Firebase** (Firestore, Auth, Storage) avec un serveur intermédiaire Express configuré selon les standards OWASP les plus stricts.

### 🛡️ Le tryptique de contrôle d'accès :
1.  **Le Client (Acheteur) :** Pouvoirs limités à la navigation, l'évaluation des produits reçus, l'ajout au panier, le paiement par Paiement à la Livraison (COD - Cash on Delivery) et l'émission de réclamations/retours sur les commandes qu'il a passées.
2.  **Le Vendeur (Seller) :** Espace étanche. Un vendeur ne peut voir que ses propres produits, ses propres finances, ses commandes, ses évaluations et ses demandes d'approbation. Ses fiches produits doivent être auditées et validées par l'administration avant d'apparaître en ligne.
3.  **L'Administrateur (Admin) :** Seul rôle ayant une visibilité totale sur l'écosystème. Il gère la conformité juridique (KYC), valide les produits, tranche les litiges, configure l'ordre de la page d'accueil, gère la monétique et surveille les journaux d'audit (*Audit Logs*) pour retracer chaque action.

### 🚫 Imperméabilité transactionnelle :
*   **Strict RBF (Role-Based Filtering) :** Implémenté via des règles Firestore robustes empêchant la lecture et l'écriture inter-vendeurs.
*   **Anti-fraude de calcul de Panier :** Les prix ne sont jamais considérés comme vrais depuis le navigateur de l'acheteur. À l'enregistrement, les prix unitaires de chaque produit sont recalculés à partir de la fiche produit d'origine de la base de données Firestore avant l'inscription de la commande finale.

---

## 3. LE STOREFRONT PUBLIC (CÔTÉ CLIENT)

Cette rubrique comprend le site internet général accessible à tous les visiteurs et acheteurs en Algérie.

| Module | Fichier principal | Description fonctionnelle |
| :--- | :--- | :--- |
| **Page d'Accueil** | `Home.tsx` | Vitrine personnalisable supportant des bannières saisonnières éditables (Ramadan, Rentrée Scolaire, Hiver, Été), des carrousels de ventes privées et de promotions hebdomadaires. |
| **Authentification** | `Auth.tsx` | Écran central de connexion unifiée avec gestion transparente des types de compte (Acheteur contre Vendeur). Intègre la vérification d'email (`VerifyEmail.tsx`) et la récupération sécurisée (`ForgotPassword.tsx`). |
| **Onboarding Vendeur** | `Onboarding.tsx` | Formulaire guidé invitant les nouveaux vendeurs à configurer grossièrement le nom de leur boutique et leurs coordonnées de contact indispensables. |
| **Catalogue & Filtres** | `ProductFilterPage.tsx` | Moteur de recherche et de catégorisation intelligent avec tri par Wilaya, prix, avis, et catégories parentes. |
| **Détails Produit** | `ProductDetails.tsx` | Fiche produit riche affichant les stocks temps réel, les notes, avis acheteurs vérifiés, et un sélecteur de variantes élégant. |
| **Boutiques Vendeurs** | `StoreProfile.tsx` / `Shop.tsx` | Mini-site dédié pour chaque vendeur agréé OLMART, présentant leur charte de couverture, leur logo, leurs notes de confiance et l'intégralité de leur inventaire. |
| **Calculateur de Livraison** | `ShippingCalculatorPage.tsx` | Permet aux internautes de simuler leurs frais de port à l'avance en fonction de la Wilaya de départ, celle de destination et de la nature de la livraison (Domicile vs Point Relai). |
| **Panier & Commande** | `Cart.tsx` / `Checkout.tsx` | Tunnel d'achat structuré avec saisie des informations de livraison rigoureuses adaptées au format postal algérien. |
| **Suivi Expédition** | `DeliveryTracking.tsx` | Tracking d'état interactif de la commande (En cours de traitement, Expédié, En cours de livraison, Livré ou En retour) sans exposer l'intimité des chauffeurs-livreurs tiers. |

---

## 4. LE TABLEAU DE BORD VENDEUR (VENDOR DASHBOARD)

Contrôlable à l'adresse `/seller/*`, cette section de haute technicité permet aux commerçants agréés de gérer leurs opérations de vente au quotidien.

### 📊 Rubriques disponibles :
1.  **Vue d'Ensemble (`Overview.tsx`) :**
    *   Indicateurs de performance : Chiffre d'affaires brut consolidé, nombre de ventes réelles, panier moyen et taux d'annulation.
    *   Graphiques financiers illustrant l'évolution des commandes validées par rapport aux commandes rejetées.
    *   Statistiques d'exécution de livraison (RTO vs Livré).
2.  **Gestion du Catalogue (`Catalog.tsx` / `ProductFormModal.tsx`) :**
    *   Tableau centralisé montrant le statut réel de chaque produit (Actif, Brouillon, En attente de validation par l'administration, Rejeté).
    *   Formulaire de création de produit moderne permettant de saisir : Titre (Bilingue FR/AR), description exhaustive, prix de vente public, prix promotionnel (barré), niveau de stock initial, catégorie cible, et caractéristiques modulables (Ex: Tailles, Couleurs disponibles).
3.  **Commandes & Bons d'Expédition (`Orders.tsx`) :**
    *   Pipeline d'expédition pas-à-pas : Commandes reçues ➔ En préparation ➔ Prêtes pour le ramassage ➔ Expédiées ➔ En Livraison ➔ Terminé / Retourné.
    *   Outil d'impression des étiquettes d'acheminement de livraison OLMART avec code-barres de suivi pour les transporteurs régionaux algériens (Yalidine, Kazi Tour, etc.).
4.  **Mon Compte Financier (`Wallet.tsx`) :**
    *   Suivi en direct de la balance financière : Solde disponible (commandes effectivement encaissées par COD et livrées), solde en attente (commandes en cours de transit) et solde retiré.
    *   Formulaire de demande de virement ou CCP pour recevoir les fonds récoltés à la livraison par la plateforme.
5.  **Gestion des Retours & Garantie (`ReturnManagement.tsx`) :**
    *   Suivi des réclamations clients.
    *   Possibilité d'éditer ou d'accepter une étiquette de retour de produit défectueux selon les lois de protection du consommateur.
6.  **Sponsoring & Visibilité (`Sponsorships.tsx`) :**
    *   *Voir [Rubrique 6](#6-fonctionnement-du-sponsoring-des-produits-détails-vendeur) pour l'explication complète.*
7.  **Documents de Conformité (`Verification.tsx`) :**
    *   Espace indispensable pour soumettre le KYC (Know Your Customer) : Copie du Registre du Commerce (RC), Pièce d'identité nationale valide, et Relevé d'Identité Bancaire/CCP (RIB/RIP) pour la liaison financière.
8.  **Paramètres de Boutique (`ShopSettings.tsx`) :**
    *   Configuration personnalisée : Identité de marque (bannière grand format, logo de la boutique, slogan), description de l'activité, et liaison avec l'adresse physique pour les transporteurs logistiques d'OLMART.
9.  **Support Direct (`Support.tsx`) :**
    *   Canal de communication bilatéral crypté et exclusif avec le support administratif d'OLMART.

---

## 5. LE PANNEAU D'ADMINISTRATION PRINCIPAL (ADMIN DASHBOARD)

Accessible uniquement par les comptes ayant l'accréditation `admin` (configuré via Firestore Auth / Custom Claims), ce panneau suprême contrôle la conformité générale d'OLMART.

### 🏢 Descriptif détaillé des rubriques :

#### 📈 1. Vue d'Ensemble Financière (`Overview.tsx`)
*   Le "Cerveau économique" d'OLMART.
*   Affiche : Volume de Ventes Global (GMV), taux moyen de réussite des transactions, nombre d'administrateurs ou d'auditeurs actifs, et le volume des réclamations ouvertes à l'échelle nationale.
*   Graphiques interactifs des ventes consolidées d'OLMART et histogrammes de répartition des commissions perçues par la plateforme.

#### 🛡️ 2. Modération des Vendeurs et KYC (`SellerModeration.tsx`)
*   L'équipe administrative valide chaque nouveau marchand.
*   **Examen des KYC :** L'admin peut inspecter les PDF/Images du registre du commerce, du RIB, de la carte d'identité, et décider d'activer la boutique, de la rejeter avec motif ou de la suspendre de manière temporaire.

#### 📦 3. Modération des Fiches Produits (`ProductModeration.tsx`)
*   Pour éviter les produits contrefaits, trompeurs ou prohibés, les fiches des vendeurs passent par cette étape de validation.
*   L'admin vérifie le réalisme des prix, la propreté du texte et la clarté des photos de produit avant d'approuver ou rejeter le produit.

#### 🏷️ 4. Éditeur de Catégories & Arborescence (`CategoriesAdmin.tsx` & `MegaMenuSettings.tsx`)
*   Outil interactif pour structurer les rayons du site (High-Tech, Mode, Automoto, Beauté, etc.).
*   Gère le Méga Menu de la barre de navigation supérieure pour fluidifier le parcours utilisateur en version ordinateur.

#### 🖼️ 5. Gestionnaire de Campagnes & Bannières (`BannerAdmin.tsx`)
*   Permet d'ajouter des bannières promotionnelles sur le site public, de régler l'URL d'affinité vers une collection spécifique de produits et de définir leur style décoratif.

#### 🏗️ 6. Constructeur de la Page d'Accueil (`HomepageBuilder.tsx`)
*   Permet de structurer l'ordre d'affichage des sections de la page d'accueil d'OLMART à la manière d'un constructeur visuel (Sections en vedette, Nouveautés, Offres du week-end).

#### 🔍 7. Moteur d'Indexation de Recherche (`SearchIndexAdmin.tsx`)
*   Assure la regénération de l'index de recherche pour que les nouveautés des vendeurs soient localisables à la milliseconde près sur tout le territoire algérien.

#### 💬 8. Arbitrage des Litiges Clients/Vendeurs (`DisputeManagement.tsx`)
*   Lorsque le client refuse un colis ou demande un retour mais que le vendeur conteste la bonne foi, l'administration fait office de tiers de confiance pour trancher et rembourser les parties ou reverser l'argent au vendeur.

#### 💰 9. Comptabilité, Trésorerie & Marges (`Finances.tsx`)
*   Gère le reversement des gains aux commerçants.
*   Permet le virement des soldes de comptes collecteurs à la suite des dépôts de fonds COD des transporteurs vers les comptes officiels d'OLMART, et le déclenchement des virements via Baridimob/CCP.

#### 🧯 10. Service Client & Support Global (`Support.tsx` / `SettingsAdmin.tsx`)
*   Résolution des tickets de support client et vendeur.

#### 📝 11. Journaux d'Audit & Sécurité (`AuditLogsAdmin.tsx`)
*   **Règle SecOps :** Enregistre la moindre modification sensible des administrateurs (suspension de vendeur, acceptation de KYC, modifications de paramètres, etc.) pour interdire toute complicité interne et assurer une traçabilité inviolable.

#### 🌐 12. Localisation & Traductions (`TranslationAdmin.tsx`)
*   Console de gestion bilingue (Arabe / Français) permettant de traduire ou mettre à jour instantanément la terminologie de l'intégralité du site sans nécessiter de redéploiement de code.

---

## 6. FONCTIONNEMENT DU SPONSORING DES PRODUITS (DÉTAILS VENDEUR)

Voici exactement comment fonctionne le système de **Sponsoring** conçu au profit de vos vendeurs :

```
                +---------------------------------+
                |   Vendeur initie la demande     |
                |  (Sélection produit + Budget)   |
                +----------------+----------------+
                                 |
                                 v
                +---------------------------------+
                |  Examen Admin (24h/48h max)    |
                | (Qualité, Cohérence des prix)   |
                +--------+---------------+--------+
                         |               |
               Approuvé  |               | Refusé (Motif)
         +---------------+               +---------------+
         |                                               |
         v                                               v
+--------+------------------------+             +--------+----------+
|  Statut actif du sponsoring     |             | Notification avec |
|  - Priorité algorithmique       |             | les corrections   |
|  - Badge visuel "Sponsorisé"    |             | à apporter        |
|  - Tri équitable tournant       |             +-------------------+
+---------------------------------+
```

### 🎯 Les Effets Principaux :
1.  **Le Badge "Sponsorisé" :** Un badge lumineux distinguera visuellement le produit dans les grilles pour attirer le regard des visiteurs et optimiser le taux de conversion.
2.  **La Priorité Absolue :** L'algorithme de tri applique un coefficient multiplicateur de visibilité. Tout produit sponsorisé et approuvé s'affiche **automatiquement en pole position** des résultats de recherche, des rayons thématiques et des collections OLMART.
3.  **L'Équité Concurrentielle :** Si plusieurs commerçants sponsorisent des produits au sein d'une même catégorie (ex: Téléphones), l'affichage alterne de manière équitable et aléatoire sur l'écran des utilisateurs pour donner une chance objective de conversion à chaque commerçant engagé.

### ⏳ Processus pas-à-pas de validation d'un sponsoring :
*   **Étape 1 [Dépôt] :** Le vendeur sélectionne son produit depuis son espace vendeur, accepte formellement la charte éthique OLMART, puis soumet sa demande.
*   **Étape 2 [Modération administrative rapide] :** L'équipe administrative d'OLMART examine la proposition en moins de 48 heures. Elle valide le respect des prix réels du marché en Algérie (pour éradiquer la concurrence déloyale ou mensongère de prix artificiels) et vérifie la qualité des visuels.
*   **Étape 3 [Activation] :** Le produit est propulsé en ligne. En cas de déclin ou de plaintes de clients (Commandes rejetées à répétition par le vendeur ou taux de retour élevé), l'admin se réserve le droit de restreindre ou supprimer ce sponsoring pour protéger l'expérience globale du client.

---

## 7. LOGISTIQUE ALGÉRIENNE : LES 58 WILAYAS ET LIVRAISON

OLMART intègre de manière structurelle la gestion de la matrice des **58 Wilayas algériennes** pour le calcul automatique des frais d'expédition.

### 📌 Caractéristiques de livraison :
*   **Double Mode de Livraison :**
    *   **À Domicile (*Home Delivery*) :** Livraison directe au lieu d'adresse du client.
    *   **En Point de Retrait (*Desk Delivery* / Recupératio dans le bureau régional) :** Option plus économique, très prisée, permettant de retirer le colis dans la succursale locale de la Wilaya à un tarif dégressif.
*   **Grille Tarifaire Personnalisable :** Depuis son espace de configuration, chaque vendeur (ou l'administrateur de manière unifiée) peut renseigner son barème logistique wilaya par wilaya.
*   **Gestion du Cash on Delivery (COD) :** Le mode par défaut en Algérie. Les transporteurs partenaires d'OLMART collectent l'argent liquide à la livraison du colis, puis le reversent de manière périodique à l'administration d'OLMART, qui l'impute au portefeuille numérique autonome de chaque vendeur.

---

## 8. GUIDE DE DÉMARRAGE RAPIDE POUR L'ADMINISTRATEUR

Pour lancer officiellement vos opérations en tant qu'administrateur suprême de la plateforme, suivez rigoureusement ces 5 premières étapes logiques :

1.  **Configuration des Rayons de Vente :** Ouvrez la rubrique **Catégories Admin** (`CategoriesAdmin.tsx`) pour créer vos premières catégories mères et enfants indispensables (ex: "Électronique" > "Téléphones Portables").
2.  **Peuplement Initial (Optionnel) :** Souhaitez-vous générer des données de test pour observer le rendu final ? Ouvrez l'espace **Seeding Admin** (`DBSeedAdmin.tsx`) et lancez le seed contrôlé pour générer des boutiques, produits et bannières fictives de mise en avant.
3.  **Vérification de la Sécurité :** Prenez l'habitude de surveiller continuellement les **Audit Logs** (`AuditLogsAdmin.tsx`) pour vous assurer que les administrateurs invités effectuent uniquement des manipulations dévolues à leur périmètre.
4.  **Bilinguisme et Contenu Publicitaire :**
    *   Utilisez l'interface **Translation Admin** (`TranslationAdmin.tsx`) pour enrichir les termes d'usage et peaufiner les phrases clés de l'arabe et du français.
    *   Gérez vos visuels de diaporama d'accueil à l'aide de l'onglet **Banner Admin** (`BannerAdmin.tsx`).
5.  **Règlement des Litiges :** En cas d'incompréhension entre un acheteur et un revendeur, rendez-vous périodiquement sur **Dispute Management** (`DisputeManagement.tsx`) pour lire les preuves photographiques transmises par le client via le système intégré d'OLMART et statuer sur le litige.

---

*Ce document fait office de cahier des charges opérationnel d'OLMART. Vous pouvez à présent en exporter le contenu dans Word (en copiant-collant le format Markdown enrichi) ou l'enregistrer au format PDF pour diffusion en interne de votre équipe de modérateurs.*
