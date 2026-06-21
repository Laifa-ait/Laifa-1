const fs = require('fs');

const fixToasts = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/toast\.error\("Erreur lors du chargement des litiges"\);/g, 'toast.error(t("Erreur lors du chargement des litiges"));');
  content = content.replace(/toast\.success\(resolution === 'approved' \? "Client remboursé sur son Wallet !" : "Litige clos sans remboursement"\);/g, 'toast.success(resolution === \\'approved\\' ? t("Client remboursé sur son Wallet !") : t("Litige clos sans remboursement"));');
  content = content.replace(/toast\.error\("Erreur lors de la résolution"\);/g, 'toast.error(t("Erreur lors de la résolution"));');
  
  content = content.replace(/toast\.error\("Erreur de chargement des commandes\."\);/g, 'toast.error(t("Erreur de chargement des commandes."));');
  content = content.replace(/toast\.error\("Erreur d'accès à l'iframe d'impression"\);/g, 'toast.error(t("Erreur d\\'accès à l\\'iframe d\\'impression"));');
  
  content = content.replace(/toast\.error\("Veuillez entrer un code coupon\."\);/g, 'toast.error(t("Veuillez entrer un code coupon."));');
  content = content.replace(/toast\.error\("Valeur de remise invalide\."\);/g, 'toast.error(t("Valeur de remise invalide."));');
  content = content.replace(/toast\.error\("Le pourcentage de remise ne peut pas dépasser 100%\."\);/g, 'toast.error(t("Le pourcentage de remise ne peut pas dépasser 100%."));');
  content = content.replace(/toast\.error\("Veuillez sélectionner une date d'expiration\."\);/g, 'toast.error(t("Veuillez sélectionner une date d\\'expiration."));');
  content = content.replace(/toast\.success\("Arbre des catégories réinitialisé aux valeurs par défaut !"\);/g, 'toast.success(t("Arbre des catégories réinitialisé aux valeurs par défaut !"));');
  content = content.replace(/toast\.error\("Cette catégorie existe déjà\."\);/g, 'toast.error(t("Cette catégorie existe déjà."));');
  content = content.replace(/toast\.success\(`Catégorie "\$\{trimmed\}" créée !`\);/g, 'toast.success(`${t("Catégorie")} "${trimmed}" ${t("créée !")}`);');
  content = content.replace(/toast\.success\(`Catégorie "\$\{catName\}" supprimée\.`\);/g, 'toast.success(`${t("Catégorie")} "${catName}" ${t("supprimée.")}`);');
  content = content.replace(/toast\.error\("Cette sous-catégorie existe déjà dans cette catégorie\."\);/g, 'toast.error(t("Cette sous-catégorie existe déjà dans cette catégorie."));');
  content = content.replace(/toast\.success\(`Sous-catégorie "\$\{trimmed\}" ajoutée !`\);/g, 'toast.success(`${t("Sous-catégorie")} "${trimmed}" ${t("ajoutée !")}`);');
  content = content.replace(/toast\.success\(`Sous-catégorie "\$\{subcatName\}" supprimée\.`\);/g, 'toast.success(`${t("Sous-catégorie")} "${subcatName}" ${t("supprimée.")}`);');
  content = content.replace(/toast\.error\("Cette sous-sous-catégorie existe déjà\."\);/g, 'toast.error(t("Cette sous-sous-catégorie existe déjà."));');
  content = content.replace(/toast\.success\(`"\$\{trimmed\}" ajouté !`\);/g, 'toast.success(`"${trimmed}" ${t("ajouté !")}`);');
  content = content.replace(/toast\.success\(`"\$\{itemToRemove\}" supprimé\.`\);/g, 'toast.success(`"${itemToRemove}" ${t("supprimé.")}`);');
  content = content.replace(/toast\.error\(err\.message \|\| "Échec de la traduction automatique\."\);/g, 'toast.error(err.message || t("Échec de la traduction automatique."));');

  fs.writeFileSync(file, content);
};

['src/pages/Admin/DisputeManagement.tsx', 'src/pages/Admin/OrdersAdmin.tsx', 'src/pages/Admin/Marketing.tsx', 'src/pages/Admin/ReviewsAdmin.tsx'].forEach(file => {
   if(fs.existsSync(file)) fixToasts(file);
});
