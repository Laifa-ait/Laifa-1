export const guideSections = [
  {
    title: "1. Introduction et Philosophie d'OLMART",
    content:
      "OLMART (Olma Marketplace) est une plateforme e-commerce multi-vendeurs de dernière génération conçue spécifiquement pour adresser les défis et opportunités du marché algérien.\n\nPrincipes Clés :\n- Mobile-First Absolu : L'interface utilisateur est entièrement pensée comme une application native haut de gamme avec sa barre de navigation inférieure fixe (Bottom Navigation Bar), des transitions fluides, et une ergonomie tactile réactive.\n- Identité Visuelle Texturée : Palette chromatique beige sable et blanc immaculé donnant un aspect moderne et épuré, contrasté par un orange vif chaleureux pour les boutons d'engagement.\n- Souveraineté des données d'OLMART : Étant donné les contraintes de sécurité, toutes les interactions (ventes, litiges, négociations, alertes) s'effectuent via les canaux internes intégrés. Aucun contournement par des messageries ou applications tierces n'est autorisé afin de garantir l'intégrité de l'arbitrage financier en cas de litige.",
  },
  {
    title: "2. Sécurité et Protocoles de transaction (DevSecOps)",
    content:
      "La plateforme repose sur une architecture Cloud sécurisée combinant React, Vite et la suite Firebase (Firestore, Auth, Storage) avec un serveur intermédiaire Express configuré selon les standards OWASP les plus stricts.\n\nLe triptyque de contrôle d'accès :\n- Le Client (Acheteur) : Pouvoirs limités à la navigation, l'évaluation des produits reçus, l'ajout au panier, le paiement par paiement à la livraison (COD) et l'émission de réclamations/retours sur ses commandes.\n- Le Vendeur (Seller) : Espace étanche. Un vendeur ne peut voir que ses propres produits, ses propres finances, ses commandes, ses évaluations et ses demandes d'approbation.\n- L'Administrateur (Admin) : Seul rôle ayant une visibilité totale sur l'écosystème. Il gère la conformité juridique (KYC), valide les produits, tranche les litiges, configure l'ordre de la page d'accueil, gère la monétique et surveille les journaux d'audit (Audit Logs) pour retracer chaque action.",
  },
  {
    title: "3. Le Storefront Public (Côté Client)",
    content:
      "Cette rubrique comprend le site internet général accessible à tous les visiteurs et acheteurs en Algérie :\n- Page d'Accueil : Vitrine personnalisable supportant des bannières saisonnières éditables (Ramadan, Rentrée Scolaire, Hiver, Été), des carrousels de ventes privées et de promotions.\n- Authentification : Écran central de connexion unifiée avec gestion transparente des types de compte (Acheteur contre Vendeur).\n- Onboarding Vendeur : Formulaire guidé invitant les nouveaux vendeurs à configurer le nom de leur boutique et leurs coordonnées.\n- Catalogue & Filtres : Moteur de recherche et de catégorisation intelligent avec tri par Wilaya, prix, avis, et catégories parentes.\n- Détails Produit : Fiche produit riche affichant les stocks temps réel, les notes, avis acheteurs vérifiés, et un sélecteur de variantes.\n- Boutiques Vendeurs : Mini-site dédié pour chaque vendeur agréé OLMART, présentant logo, charte, notes et son inventaire.\n- Calculateur de Livraison : Permet aux internautes de simuler leurs frais de port en fonction de la Wilaya de départ et d'arrivée.\n- Panier & Commande : Tunnel d'achat structuré avec saisie des informations de livraison adaptées au format postal algérien.",
  },
  {
    title: "4. Le Tableau de Bord Vendeur (Vendor Dashboard)",
    content:
      "Contrôlable à l'adresse /seller, cette section permet aux commerçants agréés de gérer leurs opérations :\n- Vue d'Ensemble : Chiffre d'affaires brut consolidé, nombre de ventes, taux d'annulation.\n- Gestion du Catalogue : Fiches produits avec titres bilingues (FR/AR), descriptions, prix publics, prix promotionnels et gestion fine des stocks.\n- Commandes & Expédition : Traitement étape par étape de la commande et impression des étiquettes d'acheminement standard OLMART.\n- Portefeuille Financier : Suivi du solde disponible (commandes effectivement livrées et encaissées) et demandes de virement CCP.\n- Gestion des Retours : Gestion des réclamations clients et acceptation d'étiquettes de retour.\n- Documents de Conformité : Hub KYC pour soumettre : Registre du Commerce (RC), Pièce d'identité nationale valide, et RIB/RIP pour la liaison financière.",
  },
  {
    title: "5. Le Panneau d'Administration Principal (Admin Dashboard)",
    content:
      "Accessible uniquement par les comptes admin, ce panneau contrôle la conformité d'OLMART :\n- Vue d'Ensemble Financière : KPI globaux (GMV, commissions perçues, litiges en cours).\n- Modération des Vendeurs : Validation des documents KYC (RC, Pièce d'identité, RIB).\n- Modération des Fiches Produits : Examen et modération pour éradiquer les prix mensongers ou interdits.\n- Éditeur de Catégories : Structuration des rayons et gestion du Méga Menu pour le e-commerce.\n- Bannières & Homepage Builder : Éléments promotionnels et agencement personnalisé de la page d'accueil.\n- Arbitrage des Litiges : Rôle de tiers de confiance pour trancher sur les dépôts de preuve en cas d'incident.\n- Journaux d'Audit & Sécurité : Enregistrement de chaque événement sensible d'administration pour interdire toute action malveillante.",
  },
  {
    title: "6. Sponsoring et Visibilité Algorithmique",
    content:
      "Le système de Sponsoring permet aux vendeurs de propulser leurs produits :\n- Badge Visuel : Un badge 'Sponsorisé' distinguera l'article dans toutes les grilles du site.\n- Priorité Absolue : L'algorithme de tri applique un coefficient multiplicateur de visibilité. Tout produit sponsorisé s'affiche automatiquement en pole position des résultats de recherche.\n- Équité Concurrentielle : L'affichage alterne de manière aléatoire et équitable si plusieurs vendeurs sponsorisent la même catégorie.\n- Processus de Validation : Soumission par le vendeur ➔ Modération par l'administration sous 48h (vérification de la qualité d'image et de l'éthique de tarification) ➔ Activation publique.",
  },
  {
    title: "7. Logistique Algérienne : Les 58 Wilayas",
    content:
      "OLMART intègre de manière structurelle la gestion de la matrice des 58 Wilayas algériennes :\n- Double Mode de Livraison : À Domicile (Home Delivery) ou En Point de Retrait (Desk Delivery) à tarif avantageux.\n- Grille Tarifaire Personnalisable : Renseignement du barème logistique wilaya par wilaya.\n- Gestion du Cash on Delivery (COD) : Recouvrement des fonds en espèces à la livraison par les transporteurs partenaires d'OLMART, puis imputation directe au portefeuille numérique sécurisé du Vendeur.",
  },
  {
    title: "8. Guide de Démarrage Rapide de l'Administrateur",
    content:
      "Pour démarrer vos activités en tant qu'administrateur suprême OLMART :\n1. Configuration des Rayons : Créez vos premières rubriques dans Categories Admin.\n2. Données de Test : Utilisez le DB Seed Admin pour peupler instantanément la base avec des vendeurs et produits démos.\n3. Surveillance : Inspectez continuellement les Audit Logs pour déceler toute faille ou action insolite.\n4. Traductions & Publicité : Personnalisez les textes bilingues dans Translation Admin et configurez des bannières de saison dans Banner Admin.\n5. Règlement des Litiges : Vérifiez régulièrement les dossiers de litige clients pour maintenir un espace commercial de confiance.",
  },
];
