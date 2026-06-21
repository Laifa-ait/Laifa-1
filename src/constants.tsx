import React from 'react';
import { 
  LayoutGrid, Sofa, Smartphone, Shirt, CarFront, Dumbbell, Baby, Hammer, Dices, Diamond, Refrigerator, BookOpen 
} from 'lucide-react';

const LipstickIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M6 12h12v10H6z" />
    <path d="M8 7l1-5h6l1 5" />
    <path d="M9 12V7h6v5" />
    <path d="M10 22v-4a2 2 0 0 1 4 0v4" />
  </svg>
);

const PantsIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M9 4L7 20h4l1-6 1 6h4L15 4h-6z" />
    <path d="M9 4v4h6V4" />
  </svg>
);

export const PRODUCT_HIERARCHY: Record<string, Record<string, string[]>> = {
  "Maison & Déco": {
    "Mobilier de Salon": [
      "Canapés & Fauteuils", "Tables basses", "Meubles TV", "Bibliothèques", "Poufs & Repose-pieds"
    ],
    "Mobilier de Chambre": [
      "Lits & Matelas", "Tables de chevet", "Armoires & Dressings", "Commodes & Chiffonniers", "Coiffeuses"
    ],
    "Mobilier de Cuisine & Salle à manger": [
      "Tables à manger", "Chaises & Tabourets", "Buffets & Vaisseliers", "Desserte de cuisine", "Îlots centraux"
    ],
    "Décoration d'intérieur": [
      "Vases & Cache-pots", "Bougies & Photophores", "Cadres photos & Tableaux", "Horloges murales", "Miroirs décoratifs", "Figurines & Statuettes", "Plantes artificielles"
    ],
    "Luminaires & Éclairage": [
      "Lampes à poser", "Lampadaires", "Suspensions & Lustres", "Appliques murales", "Plafonniers", "Guirlandes lumineuses", "Ampoules LED"
    ],
    "Linge de Maison & Textile": [
      "Rideaux & Voilages", "Stores enrouleurs", "Coussins décoratifs", "Plaids & Couvertures", "Tapis de salon & couloir", "Nappes & Sets de table", "Linge de lit (Parures, Draps)", "Linge de bain (Serviettes, Peignoirs)"
    ],
    "Cuisine & Arts de la table": [
      "Ustensiles de cuisine", "Vaisselle (Assiettes, Bols)", "Verres & Carafes", "Casseroles & Poêles", "Couverts", "Boîtes de conservation"
    ],
    "Salle de bain & WC": [
      "Meubles de salle de bain", "Accessoires (Distributeurs, Porte-savons)", "Tapis de bain", "Rideaux de douche", "Abattants WC", "Poubelles de salle de bain"
    ],
    "Jardin, Terrasse & Balcon": [
      "Salons de jardin", "Barbecues & Planchas", "Parasols & Tonnelles", "Transats & Hamacs", "Pots de fleurs & Jardinières", "Éclairage extérieur & Solaire"
    ],
    "Rangement & Entretien": [
      "Boîtes & Paniers de rangement", "Étagères murales", "Portants & Cintres", "Meubles à chaussures", "Organisation de bureau", "Matériel de nettoyage"
    ]
  },
  "Électronique": {
    "Smartphones & Téléphones": [
      "Smartphones iOS", "Smartphones Android", "Téléphones basiques", "Téléphones fixes"
    ],
    "Accessoires Téléphonie": [
      "Coques & Étuis", "Chargeurs & Câbles", "Verres trempés", "Powerbags & Batteries externes", "Supports voiture"
    ],
    "Ordinateurs & PC": [
      "PC portables", "PC de bureau", "PC Gamer", "Macbooks & iMac", "Mini PC"
    ],
    "Tablettes & Liseuses": [
      "iPad", "Tablettes Android", "Tablettes graphiques", "Liseuses", "Accessoires tablettes"
    ],
    "Périphériques Informatiques": [
      "Écrans PC", "Claviers", "Souris & Tapis", "Imprimantes & Scanners", "Onduleurs & Multiprises"
    ],
    "TV & Home Cinéma": [
      "Téléviseurs Smart TV", "Barres de son", "Vidéoprojecteurs", "Supports muraux TV", "Box Android TV & Apple TV", "Câbles HDMI & Antennes"
    ],
    "Audio & Casques": [
      "Écouteurs sans fil", "Casques Bluetooth", "Casques Gamer", "Enceintes Bluetooth", "Chaînes Hi-Fi", "Microphones"
    ],
    "Photo & Vidéo": [
      "Appareils photo Hybrides & Reflex", "Appareils photo compacts", "Caméras sportives & Action Cam", "Drones", "Objectifs", "Trépieds & Stabilisateurs"
    ],
    "Consoles & Gaming": [
      "Consoles PlayStation", "Consoles Xbox", "Consoles Nintendo", "Jeux vidéo", "Manettes & Accessoires", "Sièges & Bureaux Gamer"
    ],
    "Composants & Stockage": [
      "Disques durs internes & externes", "Clés USB & Cartes SD", "Cartes graphiques", "Processeurs & Cartes mères", "Mémoire RAM"
    ],
    "Objets Connectés": [
      "Montres connectées", "Bracelets d'activité", "Domotique (Prises, Ampoules intelligentes)", "Caméras de surveillance", "Sonnettes connectées"
    ]
  },
  "Électroménager": {
    "Froid": [
      "Réfrigérateurs", "Congélateurs", "Caves à vin", "Mini-réfrigérateurs", "Vitrines réfrigérées"
    ],
    "Lavage": [
      "Lave-linge hublot", "Lave-linge top", "Lave-linge séchant", "Sèche-linge", "Lave-vaisselle", "Mini lave-vaisselle"
    ],
    "Cuisson": [
      "Fours encastrables", "Cuisinières", "Plaques de cuisson", "Hottes aspirantes", "Micro-ondes", "Mini-fours"
    ],
    "Petit Déjeuner & Café": [
      "Machines à café expresso", "Cafetières filtres", "Bouilloires", "Grille-pain", "Presse-agrumes", "Mousseurs à lait"
    ],
    "Préparation Culinaire": [
      "Robots pâtissiers", "Robots multifonctions", "Blenders & Mixeurs", "Batteurs", "Hachoirs", "Balances de cuisine", "Machines à pain"
    ],
    "Cuisson Conviviale": [
      "Friteuses sans huile (Airfryer)", "Planchas & Grils", "Appareils à raclette", "Crépières", "Gaufriers", "Cuiseurs vapeur", "Mijoteuses"
    ],
    "Entretien des Sols": [
      "Aspirateurs balais", "Aspirateurs traîneaux", "Aspirateurs robots", "Nettoyeurs vapeur", "Cireuses"
    ],
    "Climatisation & Traitement de l'air": [
      "Climatiseurs fixes", "Climatiseurs mobiles", "Ventilateurs", "Chauffages d'appoint", "Purificateurs d'air", "Déshumidificateurs"
    ],
    "Entretien du linge": [
      "Fers à repasser", "Centrales vapeur", "Défroisseurs vapeur", "Tables à repasser", "Machines à coudre"
    ]
  },
  "Mode": {
    "Femme": [
      "Robes de soirée", "Robes d'été", "Tops & Chemisiers", "T-shirts & Débardeurs", "Pantalons & Leggings", "Jeans", "Jupes courtes & longues", "Vestes, Blazers & Manteaux", "Pulls & Gilets", "Lingerie & Nuit", "Maillots de bain", "Vêtements de maternité"
    ],
    "Homme": [
      "Chemises habillées", "Chemises casual", "T-shirts & Polos", "Jeans", "Pantalons Chino & Joggers", "Costumes & Vestons", "Manteaux, Vestes & Doudounes", "Pulls & Sweats", "Sous-vêtements & Pyjamas", "Maillots de bain"
    ],
    "Enfant": [
      "Vêtements fille (2-16 ans)", "Vêtements garçon (2-16 ans)", "Vêtements bébé (0-24 mois)", "Ensembles & Survêtements", "Pyjamas enfant", "Uniformes scolaires"
    ],
    "Chaussures Femme": [
      "Baskets & Sneakers", "Escarpins & Talons", "Sandales & Nu-pieds", "Bottes & Bottines", "Mocassins & Derbies", "Chaussons & Pantoufles"
    ],
    "Chaussures Homme": [
      "Baskets & Sneakers", "Chaussures de ville", "Sandales & Tongs", "Boots & Bottines", "Mocassins & Chaussures bateau", "Chaussons"
    ],
    "Accessoires & Bijoux": [
      "Sacs à main & Cabas", "Sacs à dos & Sacoches", "Ceintures", "Chapeaux, Casquettes & Bonnets", "Écharpes & Gants", "Bijoux (Colliers, Bagues, Bracelets)", "Montres Homme & Femme", "Lunettes de soleil"
    ],
    "Sportswear": [
      "Leggings de sport", "Brassières & Tops de sport", "Shorts de bain & Joggers", "Survêtements complets", "Chaussures de running", "Chaussures de football", "Sacs de sport"
    ]
  },
  "Beauté & Santé": {
    "Soins du visage": [
      "Nettoyants", "Sérums", "Crèmes", "Masques", "Contour des yeux", "Solaires"
    ],
    "Maquillage": [
      "Fond de teint", "Rouge à lèvres", "Mascara", "Ombres à paupières", "Pinceaux"
    ],
    "Parfums": [
      "Eaux de toilette", "Eaux de parfum", "Parfums unisexe", "Coffrets"
    ],
    "Soins corporels": [
      "Gels douche", "Laits corporels", "Huiles", "Déodorants", "Épilation"
    ],
    "Cheveux": [
      "Shampoings", "Après-shampoings", "Colorations", "Soins", "Accessoires coiffure"
    ],
    "Hygiène bucco-dentaire": [
      "Brosses à dents", "Dentifrices", "Fil dentaire", "Bain de bouche"
    ],
    "Santé & Bien-être": [
      "Compléments alimentaires", "Vitamines", "Matériel médical", "Premiers soins"
    ],
    "Appareils beauté": [
      "Brosses nettoyantes", "Épilateurs", "Sèche-cheveux", "Lisseurs"
    ]
  },
  "Auto & Moto": {
    "Accessoires auto": [
      "Housses de siège", "Tapis de sol", "Organisateurs", "Chargeurs", "Supports téléphone"
    ],
    "Entretien & Mécanique": [
      "Huiles", "Filtres", "Batteries", "Pneus", "Freins", "Outils de diagnostic"
    ],
    "Électronique auto": [
      "Autoradios", "GPS", "Dashcams", "Radars de recul", "Enceintes auto"
    ],
    "Carrosserie & Peinture": [
      "Antirouille", "Polissage", "Autocollants", "Pare-chocs", "Rétroviseurs"
    ],
    "Moto & Scooter": [
      "Casques", "Blousons", "Gants", "Bottes", "Accessoires moto", "Pièces détachées"
    ],
    "Nettoyage auto": [
      "Aspirateurs", "Shampoings", "Chiffons", "Cires", "Parfums d'ambiance"
    ]
  },
  "Sport & Loisirs": {
    "Fitness & Musculation": [
      "Haltères", "Tapis de yoga", "Élastiques", "Vélos d'appartement", "Bancs"
    ],
    "Sports collectifs": [
      "Ballons de football", "Basket", "Volley", "Maillots", "Chaussures crampons"
    ],
    "Sports de raquette": [
      "Raquettes de tennis", "Badminton", "Squash", "Balles", "Filets"
    ],
    "Sports d'extérieur": [
      "Vélos", "Trottinettes", "Skateboards", "Randonnée", "Camping", "Pêche"
    ],
    "Natation & Plage": [
      "Maillots", "Lunettes", "Bouées", "Matelas", "Palmes", "Masques de plongée"
    ],
    "Arts & Loisirs créatifs": [
      "Peinture", "Dessin", "Couture", "Scrapbooking", "Perles", "Pâte à modeler"
    ],
    "Musique & Instruments": [
      "Guitares", "Pianos", "Percussions", "Partitions", "Accessoires", "Enregistrement"
    ]
  },
  "Bébé & Puériculture": {
    "Vêtements bébé": [
      "Bodies", "Pyjamas", "Grenouillères", "Ensembles", "Chaussons", "Bonnets"
    ],
    "Couches & Hygiène": [
      "Couches jetables", "Couches lavables", "Lingettes", "Crèmes change"
    ],
    "Alimentation bébé": [
      "Biberons", "Tétines", "Chauffe-biberons", "Mixeurs", "Petit pot", "Boissons"
    ],
    "Poussettes & Sièges auto": [
      "Poussettes cannes", "3 roues", "Duo", "Sièges auto groupe 0+/1/2/3"
    ],
    "Chambre bébé": [
      "Lits", "Matelas", "Gigoteuses", "Mobiles", "Veilleuses", "Commodes à langer"
    ],
    "Sécurité & Surveillance": [
      "Babyphones", "Barrières de lit", "Barrières d'escalier", "Protège coins"
    ],
    "Jouets bébé": [
      "Hochet", "Doudous", "Tapis d'éveil", "Cubes", "Livres tissu"
    ]
  },
  "Bricolage & Outillage": {
    "Outillage électroportatif": [
      "Perceuses", "Meuleuses", "Scies", "Perforateurs", "Visseuses", "Compresseurs"
    ],
    "Outillage à main": [
      "Tournevis", "Clés", "Pinces", "Marteaux", "Scies à main", "Niveaux"
    ],
    "Menuiserie": [
      "Bois de charpente", "Panneaux MDF & Contreplaqué", "Plinthes & Moulures", "Portes & Fenêtres", "Tasseaux", "Quincaillerie de meuble"
    ],
    "Peinture & Droguerie": [
      "Peintures murales", "Vernis", "Pinceaux", "Rouleaux", "Solvants", "Enduits"
    ],
    "Électricité": [
      "Câbles", "Prises", "Interrupteurs", "Tableaux électriques", "Ampoules LED"
    ],
    "Plomberie & Sanitaire": [
      "Robinets", "Tuyaux", "Raccords", "WC", "Lavabos", "Douches", "Chauffe-eau"
    ],
    "Jardinage": [
      "Outils de jardin", "Semoirs", "Arrosage", "Terreaux", "Graines", "Serres"
    ]
  },
  "Jeux & Jouets": {
    "Jeux de société": [
      "Jeux de stratégie", "Jeux de cartes", "Jeux familiaux", "Escape games"
    ],
    "Jeux d'extérieur": [
      "Ballons", "Frisbees", "Cerf-volant", "Jeux d'eau", "Trampolines"
    ],
    "Jeux éducatifs": [
      "Puzzles", "Jeux de construction", "Livres interactifs", "Science kits"
    ],
    "Jeux de rôle & Déguisements": [
      "Déguisements", "Accessoires", "Maquillage", "Épées", "Baguettes"
    ],
    "Figurines & Collections": [
      "Figurines action", "Funko Pop", "Cartes à collectionner", "Voitures miniatures"
    ],
    "Poupées & Peluches": [
      "Poupées", "Maisons de poupées", "Peluches", "Doudous", "Poupées Reborn"
    ],
    "Véhicules enfants": [
      "Vélos", "Draisiennes", "Voitures à pédales", "Trottinettes", "Tricycles"
    ]
  },
  "Supermarché": {
    "Hygiène & Beauté": [
      "Gels douche & Savons", "Shampoings & Après-shampoings", "Hygiène dentaire", "Déodorants", "Soin du visage", "Soin du corps", "Rasage & Épilation", "Hygiène intime", "Mouchoirs & Cotons"
    ],
    "Entretien de la maison": [
      "Produits vaisselle", "Lessives & Adoucissants", "Nettoyants sols & surfaces", "Nettoyeurs vitres", "Désodorisants", "Accessoires de ménage", "Sacs poubelle", "Papier toilette & Essuie-tout"
    ]
  },
  "Scolaire & Bureau": {
    "Rentrée Scolaire": [
      "Cahiers & Registres", "Stylos & Feutres", "Trousses", "Agendas & Cahiers de texte", "Matériel de traçage & Géométrie", "Calculatrices scientifiques", "Arts plastiques & Dessin"
    ],
    "Sacs & Cartables": [
      "Cartables primaire", "Sacs à dos collège & lycée", "Sacs à roulettes", "Boîtes à goûter & Gourdes"
    ],
    "Papeterie & Bureau": [
      "Papiers & Blocs", "Organisation & Classement", "Petites fournitures", "Accessoires de bureau", "Machines de bureau", "Papeterie fantaisie"
    ],
    "Livres & Romans": [
      "Romans & Littérature", "Livres Scientifiques", "Développement Personnel", "Sciences Humaines & Histoire", "Livres pour enfants", "Livres en langues étrangères"
    ],
    "Parascolaire Primaire": [
      "1ère & 2ème AP", "3ème & 4ème AP", "5ème AP (Examen de fin de cycle)", "Cahiers de vacances", "Dictionnaires primaires"
    ],
    "Parascolaire Moyen": [
      "1ère AM", "2ème AM", "3ème AM", "4ème AM (BEM)", "Annales & Sujets BEM", "Dictionnaires collège"
    ],
    "Parascolaire Secondaire": [
      "1ère AS (Tronc commun)", "2ème AS", "3ème AS (Terminal - BAC)", "Annales & Sujets BAC", "Fiches de révision"
    ]
  }
};

export const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Tous: LayoutGrid,
  "Maison & Déco": Sofa,
  "Électronique": Smartphone,
  "Électroménager": Refrigerator,
  "Mode": Shirt,
  "Mode & Vêtements": Shirt,
  "Beauté & Santé": LipstickIcon,
  "Auto & Moto": CarFront,
  "Sport & Loisirs": Dumbbell,
  "Bébé & Puériculture": Baby,
  "Bricolage & Outillage": Hammer,
  "Jeux & Jouets": Dices,
  "Supermarché": Diamond,
  "Scolaire & Bureau": BookOpen,
};

export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; activeBg: string; activeText: string }
> = {
  Tous: {
    bg: "bg-zinc-100",
    text: "text-zinc-700",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  "Maison & Déco": {
    bg: "bg-amber-100/50",
    text: "text-amber-800",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  "Électronique": {
    bg: "bg-blue-100/50",
    text: "text-blue-800",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  "Électroménager": {
    bg: "bg-cyan-100/50",
    text: "text-cyan-800",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  Mode: {
    bg: "bg-indigo-100/50",
    text: "text-indigo-800",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  "Beauté & Santé": {
    bg: "bg-pink-100/50",
    text: "text-pink-800",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  "Auto & Moto": {
    bg: "bg-rose-100/50",
    text: "text-rose-800",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  "Sport & Loisirs": {
    bg: "bg-emerald-100/50",
    text: "text-emerald-800",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  "Bébé & Puériculture": {
    bg: "bg-sky-100/50",
    text: "text-sky-800",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  "Bricolage & Outillage": {
    bg: "bg-orange-100/50",
    text: "text-orange-850",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  "Jeux & Jouets": {
    bg: "bg-violet-100/50",
    text: "text-violet-800",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  "Supermarché": {
    bg: "bg-red-100/50",
    text: "text-red-800",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
  "Scolaire & Bureau": {
    bg: "bg-yellow-100/50",
    text: "text-yellow-800",
    activeBg: "bg-emerald-600",
    activeText: "text-white",
  },
};

export const CATEGORY_IMAGES: Record<string, string> = {
  Tous: "https://images.unsplash.com/photo-1555529771-835f59fc5efe?auto=format&fit=crop&q=80&w=200",
  "Maison & Déco":
    "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=200",
  "Électronique":
    "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=200",
  "Électroménager":
    "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=200",
  Mode: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=200",
  "Beauté & Santé":
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=200",
  "Auto & Moto":
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=200",
  "Sport & Loisirs":
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=200",
  "Bébé & Puériculture": "https://images.unsplash.com/photo-1519689689353-897c1bd303b5?auto=format&fit=crop&q=80&w=200",
  "Bricolage & Outillage": "https://images.unsplash.com/photo-1581244276891-997d6273424a?auto=format&fit=crop&q=80&w=200",
  "Jeux & Jouets": "https://images.unsplash.com/photo-1533038590840-349c81a285d8?auto=format&fit=crop&q=80&w=200",
  "Supermarché": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=200",
  "Scolaire & Bureau": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=200"
};

export const ALGERIA_SHIPPING_DATA: Record<string, { price: number; delay: string }> = {
  Adrar: { price: 1200, delay: "3-5 jours" },
  Chlef: { price: 600, delay: "2-3 jours" },
  Laghouat: { price: 800, delay: "2-4 jours" },
  "Oum El Bouaghi": { price: 700, delay: "2-3 jours" },
  Batna: { price: 700, delay: "2-3 jours" },
  Béjaïa: { price: 600, delay: "2-3 jours" },
  Biskra: { price: 800, delay: "2-4 jours" },
  Béchar: { price: 1000, delay: "3-5 jours" },
  Blida: { price: 500, delay: "24-48h" },
  Bouira: { price: 600, delay: "2-3 jours" },
  Tamanrasset: { price: 1500, delay: "4-7 jours" },
  Tébessa: { price: 800, delay: "3-4 jours" },
  Tlemcen: { price: 800, delay: "3-4 jours" },
  Tiaret: { price: 700, delay: "2-4 jours" },
  "Tizi Ouzou": { price: 600, delay: "2-3 jours" },
  Alger: { price: 500, delay: "24-48h" },
  Djelfa: { price: 700, delay: "2-4 jours" },
  Jijel: { price: 700, delay: "2-4 jours" },
  Sétif: { price: 600, delay: "2 jours" },
  Saïda: { price: 800, delay: "3-4 jours" },
  Skikda: { price: 700, delay: "2-4 jours" },
  "Sidi Bel Abbès": { price: 700, delay: "2-4 jours" },
  Annaba: { price: 750, delay: "3 jours" },
  Guelma: { price: 750, delay: "3 jours" },
  Constantine: { price: 700, delay: "2-3 jours" },
  Médéa: { price: 600, delay: "2-3 jours" },
  Mostaganem: { price: 700, delay: "2-4 jours" },
  "M'Sila": { price: 700, delay: "2-4 jours" },
  Mascara: { price: 700, delay: "2-4 jours" },
  Ouargla: { price: 900, delay: "3-5 jours" },
  Oran: { price: 700, delay: "2-3 jours" },
  "El Bayadh": { price: 900, delay: "3-5 jours" },
  Illizi: { price: 1500, delay: "4-7 jours" },
  "Bordj Bou Arréridj": { price: 600, delay: "2-3 jours" },
  Boumerdès: { price: 500, delay: "24-48h" },
  "El Tarf": { price: 800, delay: "3-4 jours" },
  Tindouf: { price: 1500, delay: "4-7 jours" },
  Tissemsilt: { price: 700, delay: "2-4 jours" },
  "El Oued": { price: 900, delay: "3-5 jours" },
  Khenchela: { price: 800, delay: "3-4 jours" },
  "Souk Ahras": { price: 800, delay: "3-4 jours" },
  Tipaza: { price: 500, delay: "24-48h" },
  Mila: { price: 700, delay: "2-4 jours" },
  "Aïn Defla": { price: 600, delay: "2-3 jours" },
  Naâma: { price: 900, delay: "3-5 jours" },
  "Aïn Témouchent": { price: 700, delay: "2-4 jours" },
  Ghardaïa: { price: 800, delay: "3-4 jours" },
  Relizane: { price: 700, delay: "2-4 jours" },
  "El M'Ghair": { price: 900, delay: "3-5 jours" },
  "El Meniaa": { price: 900, delay: "3-5 jours" },
  "Ouled Djellal": { price: 900, delay: "3-5 jours" },
  "Bordj Baji Mokhtar": { price: 1500, delay: "4-7 jours" },
  "Béni Abbès": { price: 1200, delay: "3-5 jours" },
  Timimoun: { price: 1200, delay: "3-5 jours" },
  Touggourt: { price: 900, delay: "3-5 jours" },
  Djanet: { price: 1500, delay: "4-7 jours" },
  "In Salah": { price: 1500, delay: "4-7 jours" },
  "In Guezzam": { price: 1500, delay: "4-7 jours" },
  Default: { price: 900, delay: "3-5 jours" },
};

export const ALGERIA_WILAYAS = [
  "01 Adrar", "02 Chlef", "03 Laghouat", "04 Oum El Bouaghi", "05 Batna",
  "06 Béjaïa", "07 Biskra", "08 Béchar", "09 Blida", "10 Bouira",
  "11 Tamanrasset", "12 Tébessa", "13 Tlemcen", "14 Tiaret", "15 Tizi Ouzou",
  "16 Alger", "17 Djelfa", "18 Jijel", "19 Sétif", "20 Saïda",
  "21 Skikda", "22 Sidi Bel Abbès", "23 Annaba", "24 Guelma", "25 Constantine",
  "26 Médéa", "27 Mostaganem", "28 M'Sila", "29 Mascara", "30 Ouargla",
  "31 Oran", "32 El Bayadh", "33 Illizi", "34 Bordj Bou Arréridj", "35 Boumerdès",
  "36 El Tarf", "37 Tindouf", "38 Tissemsilt", "39 El Oued", "40 Khenchela",
  "41 Souk Ahras", "42 Tipaza", "43 Mila", "44 Aïn Defla", "45 Naâma",
  "46 Aïn Témouchent", "47 Ghardaïa", "48 Relizane", "49 El M'Ghair", "50 El Meniaa",
  "51 Ouled Djellal", "52 Bordj Baji Mokhtar", "53 Béni Abbès", "54 Timimoun", "55 Touggourt",
  "56 Djanet", "57 In Salah", "58 In Guezzam"
];

import { Product, Language } from "./types";
import { getTranslatedField } from "./utils/translations";

export function cleanString(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function getProductSearchScore(
  product: Product,
  queryStr: string,
  lang: Language,
): number {
  if (!queryStr) return 0;

  const query = cleanString(queryStr);
  if (query.length === 0) return 0;

  const productName = cleanString(getTranslatedField(product, 'name', lang) || "");
  const productDesc = cleanString(getTranslatedField(product, 'description', lang) || "");
  const productCategory = cleanString(product.category || "");
  const productSubcategory = cleanString(product.subcategory || "");
  const productBrand = cleanString(product.brand || "");
  const productTags = (product.tags || []).map((t) => cleanString(t));

  let score = 0;

  // 1. Exact or starts-with name match (highest value)
  if (productName === query) {
    score += 100;
  } else if (productName.startsWith(query)) {
    score += 50;
  } else if (productName.includes(query)) {
    score += 30;
  }

  // 2. Category/Subcategory matches
  if (productCategory === query) {
    score += 40;
  } else if (productCategory.includes(query)) {
    score += 20;
  }

  if (productSubcategory === query) {
    score += 35;
  } else if (productSubcategory.includes(query)) {
    score += 15;
  }

  // 3. Brand match
  if (productBrand === query) {
    score += 25;
  } else if (productBrand.includes(query)) {
    score += 10;
  }

  // 4. Tags match
  if (productTags.includes(query)) {
    score += 30;
  } else if (productTags.some((t) => t.includes(query))) {
    score += 15;
  }

  // 5. Description match
  if (productDesc.includes(query)) {
    score += 10;
  }

  // 6. Semantic Synonyms Match
  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const isKeywordMatched = keywords.some((kw) => {
      const cleanKw = cleanString(kw);
      return query.includes(cleanKw) || cleanKw.includes(query);
    });

    if (isKeywordMatched) {
      if (cleanString(product.category) === cleanString(categoryName)) {
        score += 65;
      }
      keywords.forEach((kw) => {
        const cleanKw = cleanString(kw);
        if (productName.includes(cleanKw)) score += 15;
        if (productTags.includes(cleanKw)) score += 10;
      });
    }
  }

  const queryWords = query.split(/\s+/).filter((w) => w.length > 2);
  if (queryWords.length > 1) {
    let wordMatches = 0;
    queryWords.forEach((word) => {
      if (
        productName.includes(word) ||
        productCategory.includes(word) ||
        productTags.includes(word) ||
        productDesc.includes(word)
      ) {
        score += 15;
        wordMatches++;
      }
    });
    if (wordMatches === queryWords.length) {
      score += 40;
    }
  }

  return score;
}

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Maison & Déco": [
    "mobilier",
    "meuble",
    "décoration",
    "deco",
    "luminaire",
    "vaisselle",
    "cuisine",
    "table",
    "lit",
    "matelas",
    "armoire",
    "luminaire",
    "lampe",
    "lustre",
    "salle de bain",
    "jardin",
    "extérieur",
    "vase",
  ],
  "Électronique": [
    "téléphone",
    "telephone",
    "smartphone",
    "pc",
    "ordinateur",
    "informatique",
    "écran",
    "tv",
    "téléviseur",
    "audio",
    "casque",
    "écouteur",
    "console",
    "gaming",
    "electronique",
  ],
  "Électroménager": [
    "réfrigérateur",
    "frigo",
    "congélateur",
    "machine à laver",
    "lave linge",
    "climatiseur",
    "chauffage",
    "robot",
    "cafetière",
    "aspirateur",
    "lisseur",
    "électroménager",
    "four",
    "mixeur",
  ],
  Mode: [
    "vêtement",
    "vetement",
    "vêtements",
    "habit",
    "habits",
    "robe",
    "veste",
    "manteau",
    "chemise",
    "pull",
    "pantalon",
    "jean",
    "costume",
    "chaussure",
    "basket",
    "sneakers",
    "chaussures",
    "sac",
    "bagagerie",
    "maroquinerie",
    "bijou",
    "bijoux",
    "montre",
    "lunette",
    "ceinture",
  ],
  "Beauté & Santé": [
    "cosmétique",
    "cosmétiques",
    "cosmetics",
    "cosmetic",
    "maquillage",
    "parfum",
    "soin",
    "visage",
    "corps",
    "cheveux",
    "hygiène",
    "dentaire",
    "santé",
    "vitamine",
    "bien être",
    "massage",
  ],
  "Auto & Moto": [
    "auto",
    "voiture",
    "moto",
    "scooter",
    "accessoire",
    "pièce",
    "entretien",
    "mécanique",
    "pneu",
    "batterie",
    "huile",
    "carrosserie",
    "casque",
    "gant",
  ],
  "Sport & Loisirs": [
    "sport",
    "fitness",
    "musculation",
    "football",
    "basket",
    "tennis",
    "natation",
    "vélo",
    "randonnée",
    "camping",
    "pêche",
    "instrument",
    "musique",
    "peinture",
    "dessin",
  ],
  "Bébé & Puériculture": [
    "bébé",
    "enfant",
    "nouveau né",
    "poussette",
    "couche",
    "biberon",
    "jouet",
    "éveil",
    "grossesse",
    "maternité",
  ],
  "Bricolage & Outillage": [
    "outil",
    "perceuse",
    "marteau",
    "tournevis",
    "peinture",
    "électricité",
    "plomberie",
    "jardinage",
    "quincaillerie",
    "construction",
  ],
  "Jeux & Jouets": [
    "jouet",
    "jeu",
    "société",
    "poupée",
    "peluche",
    "puzzles",
    "construction",
    "lego",
    "playmobil",
    "éducatif",
    "extérieur",
  ],
  "Supermarché": [
    "supermarché",
    "alimentation",
    "boissons",
    "jus",
    "café",
    "thé",
    "épices",
    "conserve",
    "hygiène",
    "entretien",
    "nettoyant",
  ],
  "Scolaire & Bureau": [
    "scolaire",
    "fourniture",
    "bureau",
    "papeterie",
    "cahier",
    "stylo",
    "livre",
    "roman",
    "parascolaire",
    "cartable",
    "école",
  ]
};

export const PRODUCT_COLORS = [
  { name: 'Noir', hex: '#000000' },
  { name: 'Blanc', hex: '#FFFFFF', border: true },
  { name: 'Gris', hex: '#9CA3AF' },
  { name: 'Gris Foncé', hex: '#4B5563' },
  { name: 'Bleu Marine', hex: '#1E3A8A' },
  { name: 'Bleu', hex: '#3B82F6' },
  { name: 'Bleu Ciel', hex: '#7DD3FC' },
  { name: 'Rouge', hex: '#EF4444' },
  { name: 'Bordeaux', hex: '#7F1D1D' },
  { name: 'Vert', hex: '#10B981' },
  { name: 'Vert Olive', hex: '#65A30D' },
  { name: 'Jaune', hex: '#FACC15' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Rose', hex: '#EC4899' },
  { name: 'Rose Poudré', hex: '#FBCFE8' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Marron', hex: '#78350F' },
  { name: 'Beige', hex: '#FDE68A' },
  { name: 'Or', hex: '#D4AF37' },
  { name: 'Argent', hex: '#C0C0C0' },
  { name: 'Bronze', hex: '#CD7F32' },
  { name: 'Multicolore', hex: 'linear-gradient(45deg, red, yellow, green, blue)' }
];
