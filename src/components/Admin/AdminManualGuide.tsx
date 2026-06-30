import React, { useState } from "react";
import { BookOpen, ChevronUp, ChevronDown, Download, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const getGuideSections = (t: any) => [
  {
    title: t("1. Introduction et Philosophie d'OLMART"),
    content: t(
      "OLMART (Olma Marketplace) est une plateforme e-commerce multi-vendeurs de dernière génération conçue spécifiquement pour adresser les défis et opportunités du marché algérien.\n\nPrincipes Clés :\n- Mobile-First Absolu : L'interface utilisateur est entièrement pensée comme une application native haut de gamme avec sa barre de navigation inférieure fixe (Bottom Navigation Bar), des transitions fluides, et une ergonomie tactile réactive.\n- Identité Visuelle Texturée : Palette chromatique beige sable et blanc immaculé donnant un aspect moderne et épuré, contrasté par un orange vif chaleureux pour les boutons d'engagement.\n- Souveraineté des données d'OLMART : Étant donné les contraintes de sécurité, toutes les interactions (ventes, litiges, négociations, alertes) s'effectuent via les canaux internes intégrés. Aucun contournement par des messageries ou applications tierces n'est autorisé afin de garantir l'intégrité de l'arbitrage financier en cas de litige."
    ),
  },
  {
    title: t("2. Sécurité et Protocoles de transaction (DevSecOps)"),
    content: t(
      "La plateforme repose sur une architecture Cloud sécurisée combinant React, Vite et la suite Firebase (Firestore, Auth, Storage) avec un serveur intermédiaire Express configuré selon les standards OWASP les plus stricts.\n\nLe triptyque de contrôle d'accès :\n- Le Client (Acheteur) : Pouvoirs limités à la navigation, l'évaluation des produits reçus, l'ajout au panier, le paiement par paiement à la livraison (COD) et l'émission de réclamations/retours sur ses commandes.\n- Le Vendeur (Seller) : Espace étanche. Un vendeur ne peut voir que ses propres produits, ses propres finances, ses commandes, ses évaluations et ses demandes d'approbation.\n- L'Administrateur (Admin) : Seul rôle ayant une visibilité totale sur l'écosystème. Il gère la conformité juridique (KYC), valide les produits, tranche les litiges, configure l'ordre de la page d'accueil, gère la monétique et surveille les journaux d'audit (Audit Logs) pour retracer chaque action."
    ),
  },
  {
    title: t("3. Le Storefront Public (Côté Client)"),
    content: t(
      "Cette rubrique comprend le site internet général accessible à tous les visiteurs et acheteurs en Algérie :\n- Page d'Accueil : Vitrine personnalisable supportant des bannières saisonnières éditables (Ramadan, Rentrée Scolaire, Hiver, Été), des carrousels de ventes privées et de promotions.\n- Authentification : Écran central de connexion unifiée avec gestion transparente des types de compte (Acheteur contre Vendeur).\n- Onboarding Vendeur : Formulaire guidé invitant les nouveaux vendeurs à configurer le nom de leur boutique et leurs coordonnées.\n- Catalogue & Filtres : Moteur de recherche et de catégorisation intelligent avec tri par Wilaya, prix, avis, et catégories parentes.\n- Détails Produit : Fiche produit riche affichant les stocks temps réel, les notes, avis acheteurs vérifiés, et un sélecteur de variantes.\n- Boutiques Vendeurs : Mini-site dédié pour chaque vendeur agréé OLMART, présentant logo, charte, notes et son inventaire.\n- Calculateur de Livraison : Permet aux internautes de simuler leurs frais de port en fonction de la Wilaya de départ et d'arrivée.\n- Panier & Commande : Tunnel d'achat structuré avec saisie des informations de livraison adaptées au format postal algérien."
    ),
  },
  {
    title: t("4. Le Tableau de Bord Vendeur (Vendor Dashboard)"),
    content: t(
      "Contrôlable à l'adresse /seller, cette section permet aux commerçants agréés de gérer leurs opérations :\n- Vue d'Ensemble : Chiffre d'affaires brut consolidé, nombre de ventes, taux d'annulation.\n- Gestion du Catalogue : Fiches produits avec titres bilingues (FR/AR), descriptions, prix publics, prix promotionnels et gestion fine des stocks.\n- Commandes & Expédition : Traitement étape par étape de la commande et impression des étiquettes d'acheminement standard OLMART.\n- Portefeuille Financier : Suivi du solde disponible (commandes effectivement livrées et encaissées) et demandes de virement CCP.\n- Gestion des Retours : Gestion des réclamations clients et acceptation d'étiquettes de retour.\n- Documents de Conformité : Hub KYC pour soumettre : Registre du Commerce (RC), Pièce d'identité nationale valide, et RIB/RIP pour la liaison financière."
    ),
  },
  {
    title: t("5. Le Panneau d'Administration Principal (Admin Dashboard)"),
    content: t(
      "Accessible uniquement par les comptes admin, ce panneau contrôle la conformité d'OLMART :\n- Vue d'Ensemble Financière : KPI globaux (GMV, commissions perçues, litiges en cours).\n- Modération des Vendeurs : Validation des documents KYC (RC, Pièce d'identité, RIB).\n- Modération des Fiches Produits : Examen et modération pour éradiquer les prix mensongers ou interdits.\n- Éditeur de Catégories : Structuration des rayons et gestion du Méga Menu pour le e-commerce.\n- Bannières & Homepage Builder : Éléments promotionnels et agencement personnalisé de la page d'accueil.\n- Arbitrage des Litiges : Rôle de tiers de confiance pour trancher sur les dépôts de preuve en cas d'incident.\n- Journaux d'Audit & Sécurité : Enregistrement de chaque événement sensible d'administration pour interdire toute action malveillante."
    ),
  },
  {
    title: t("6. Sponsoring et Visibilité Algorithmique"),
    content: t(
      "Le système de Sponsoring permet aux vendeurs de propulser leurs produits :\n- Badge Visuel : Un badge 'Sponsorisé' distinguera l'article dans toutes les grilles du site.\n- Priorité Absolue : L'algorithme de tri applique un coefficient multiplicateur de visibilité. Tout produit sponsorisé s'affiche automatiquement en pole position des résultats de recherche.\n- Équité Concurrentielle : L'affichage alterne de manière aléatoire et équitable si plusieurs vendeurs sponsorisent la même catégorie.\n- Processus de Validation : Soumission par le vendeur ➔ Modération par l'administration sous 48h (vérification de la qualité d'image et de l'éthique de tarification) ➔ Activation publique."
    ),
  },
  {
    title: t("7. Logistique Algérienne : Les 58 Wilayas"),
    content: t(
      "OLMART intègre de manière structurelle la gestion de la matrice des 58 Wilayas algériennes :\n- Double Mode de Livraison : À Domicile (Home Delivery) ou En Point de Retrait (Desk Delivery) à tarif avantageux.\n- Grille Tarifaire Personnalisable : Renseignement du barème logistique wilaya par wilaya.\n- Gestion du Cash on Delivery (COD) : Recouvrement des fonds en espèces à la livraison par les transporteurs partenaires d'OLMART, puis imputation directe au portefeuille numérique sécurisé du Vendeur."
    ),
  },
  {
    title: t("8. Guide de Démarrage Rapide de l'Administrateur"),
    content: t(
      "Pour démarrer vos activités en tant qu'administrateur suprême OLMART :\n1. Configuration des Rayons : Créez vos premières rubriques dans Categories Admin.\n2. Données de Test : Utilisez le DB Seed Admin pour peupler instantanément la base avec des vendeurs et produits démos.\n3. Surveillance : Inspectez continuellement les Audit Logs pour déceler toute faille ou action insolite.\n4. Traductions & Publicité : Personnalisez les textes bilingues dans Translation Admin et configurez des bannières de saison dans Banner Admin.\n5. Règlement des Litiges : Vérifiez régulièrement les dossiers de litige clients pour maintenir un espace commercial de confiance."
    ),
  },
];

const exportManualToPDF = async (t: any) => {
  const { jsPDF } = await import("jspdf");
  
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageHeight = 297;
  const pageWidth = 210;
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2;

  let currentY = 25;
  let pageNum = 1;

  const drawPageDecoration = (pNum: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(t("OLMART • MANUEL DE GESTION ADMINISTRATIVE & TECHNIQUE"), marginX, 15);
    doc.line(marginX, 17, pageWidth - marginX, 17);
    doc.text(t("CONFIDENTIEL • RÉSERVÉ À L'ADMINISTRATION OLMART"), marginX, pageHeight - 12);
    doc.text(`${t("Page")} ${pNum}`, pageWidth - marginX, pageHeight - 12, { align: "right" });
  };

  doc.setFillColor(24, 24, 27);
  doc.rect(15, 20, pageWidth - 30, 60, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text("OLMART", pageWidth / 2, 45, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(234, 88, 12);
  doc.text(t("MARKETPLACE MULTI-VENDEURS • ALGÉRIE"), pageWidth / 2, 57, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(24, 24, 27);
  doc.text(t("MANUEL DE GESTION & GUIDE D'UTILISATION"), marginX, 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(t("Auteur : Equipe de Developpement Full-Stack Senior & DevSecOps"), marginX, 110);
  doc.text(`${t("Date de Generation :")} ${new Date().toLocaleDateString("fr-FR")}`, marginX, 116);
  doc.text(t("Document de reference pour l'administration et la moderation"), marginX, 122);

  doc.setLineWidth(0.5);
  doc.setDrawColor(234, 88, 12);
  doc.line(marginX, 130, pageWidth - marginX, 130);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.text(t("OBJECTIFS DU MANUEL :"), marginX, 145);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(80, 80, 80);

  const objectives = [
    t("- Assurer l'onboarding et la formation continue des administrateurs et moderateurs."),
    t("- Garantir la conformite de la securite transactionnelle (DevSecOps) et la moderation KYC."),
    t("- Maitriser le fonctionnement de l'attribution algorithmique du sponsoring d'OLMART."),
    t("- Configurer et piloter la grille logistique nationale basee sur les 58 Wilayas algeriennes."),
    t("- Resoudre de maniere juste les litiges financiers pour asseoir la confiance des clients."),
  ];

  let tempY = 153;
  objectives.forEach((obj) => {
    doc.text(obj, marginX, tempY);
    tempY += 7;
  });

  doc.setFillColor(254, 243, 199);
  doc.rect(marginX, 200, contentWidth, 35, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(180, 83, 9);
  doc.text(t("RECOMMANDATION SECURITE IMPORTANTE :"), marginX + 5, 208);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 83, 9);
  const securityWarning = doc.splitTextToSize(
    t(
      "Ne partagez jamais vos identifiants d'administration supreme. Toute action est enregistree de maniere immuable dans les Audit Logs systeme et imputee a votre adresse email de session."
    ),
    contentWidth - 10
  );
  doc.text(securityWarning, marginX + 5, 214);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("CONFIDENTIEL • OLMART CO.", marginX, pageHeight - 12);
  doc.text(t("Page 1"), pageWidth - marginX, pageHeight - 12, { align: "right" });

  getGuideSections(t).forEach((section) => {
    doc.addPage();
    pageNum++;
    drawPageDecoration(pageNum);

    currentY = 30;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(234, 88, 12);
    doc.text(section.title, marginX, currentY);
    currentY += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);

    const paragraphs = section.content.split("\n");

    paragraphs.forEach((p: string) => {
      if (!p.trim()) {
        currentY += 4;
        return;
      }

      const wrappedLines = doc.splitTextToSize(p, contentWidth);
      const neededSpace = wrappedLines.length * 5 + 6;

      if (currentY + neededSpace > pageHeight - 25) {
        doc.addPage();
        pageNum++;
        drawPageDecoration(pageNum);
        currentY = 30;
      }

      doc.text(wrappedLines, marginX, currentY);
      currentY += wrappedLines.length * 5 + 4;
    });
  });

  doc.save("GUIDE_UTILISATEUR_OLMART.pdf");
};

export const AdminManualGuide: React.FC = () => {
  const { t } = useTranslation();
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const sections = getGuideSections(t);

  return (
    <div className="bg-white rounded-[2.5rem] border border-zinc-200 p-8 shadow-sm relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-kinder text-zinc-950 tracking-tight rtl:tracking-normal">
              {t("📖 Manuel de Gestion & Guide d'Utilisation OLMART")}
            </h3>
            <p className="text-zinc-500 text-xs font-semibold">
              {t("Le document technique complet pour piloter et comprendre l'intégralité du site OLMART.")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsGuideOpen(!isGuideOpen)}
            className="flex items-center gap-2 px-5 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal transition-all cursor-pointer border-none"
          >
            {isGuideOpen ? (
              <>
                {t("Masquer le manuel")}
                <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                {t("Lire en ligne")}
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
          <button
            onClick={() => exportManualToPDF(t)}
            className="flex items-center gap-2 px-5 py-3 bg-[#ea580c] hover:bg-orange-600 text-white rounded-xl font-kinder text-[10px] uppercase tracking-widest rtl:tracking-normal transition-all cursor-pointer shadow-md shadow-orange-500/10 border-none"
          >
            <Download className="w-4 h-4" /> {t("Exporter PDF officiel")}
          </button>
        </div>
      </div>

      {isGuideOpen && (
        <div className="mt-8 border-t border-zinc-100 pt-8 space-y-6">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3 text-amber-800 text-xs font-bold items-start">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
            <div>
              <p className="uppercase tracking-wider rtl:tracking-normal font-kinder text-[9px] mb-1 text-amber-900">
                {t("Règle de Sécurité Interne (DevSecOps)")}
              </p>
              {t(
                "Ce manuel est confidentiel et réservé à l'équipe de modération agréée OLMART. Ne l'imprimez ou ne le diffusez pas en dehors de vos canaux sécurisés."
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {sections.map((sec, idx) => (
              <div
                key={idx}
                className="bg-zinc-50 border border-zinc-100 p-6 rounded-[2rem] flex flex-col justify-between"
              >
                <div>
                  <h4 className="text-xs font-kinder text-[#ea580c] mb-3 uppercase tracking-wider rtl:tracking-normal">
                    {sec.title}
                  </h4>
                  <p className="text-zinc-600 text-xs font-medium leading-relaxed whitespace-pre-line">{sec.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
