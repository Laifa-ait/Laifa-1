const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin/ProductModeration.tsx', 'utf8');

const approveCode = `
  const handleApprove = async (product: any) => {
    try {
       const token = await currentUser?.getIdToken(true);
       if (!token) throw new Error("Non authentifié");
       
       const res = await fetch(\`/api/admin/products/\${product.id}/approve\`, {
         method: 'POST',
         headers: { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' }
       });
       
       if (!res.ok) {
         throw new Error("Erreur serveur");
       }
       
       const data = await res.json();
       
       setProducts(prev => prev.filter(p => p.id !== product.id));
       
       toast.success(
         isArabic
           ? \`تمت الموافقة على المنتج "\${product.name}" بنجاح! (درجة الجودة: \${data.score})\`
           : \`Produit "\${product.name}" approuvé avec succès ! (Score de Pertinence : \${data.score})\`
       );
    } catch (err) {
       console.error("Error approving product:", err);
       toast.error(t("Erreur lors de l'approbation du produit."));
    }
  };`;

const rejectCode = `
  const handleRejectSubmit = async () => {
    if (!targetProduct) return;
    const finalReason = rejectReason === "Autre reason" ? customReason : rejectReason;
    if (!finalReason.trim()) {
      toast.error(t("Veuillez renseigner ou sélectionner un motif de refus."));
      return;
    }
 
    try {
      const token = await currentUser?.getIdToken(true);
      if (!token) throw new Error("Non authentifié");

      const res = await fetch(\`/api/admin/products/\${targetProduct.id}/reject\`, {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason })
      });
      
      if (!res.ok) {
        throw new Error("Erreur serveur");
      }

      setProducts(prev => prev.filter(p => p.id !== targetProduct.id));
      setRejectModalOpen(false);
      setTargetProduct(null);
      toast.success(
        isArabic ? \`تم رفض المنتج "\${targetProduct.name}".\` : \`Le produit "\${targetProduct.name}" a été rejeté.\`
      );
    } catch (err) {
      console.error("Error rejecting product:", err);
      toast.error(t("Erreur lors du rejet du produit."));
    }
  };`;

const recalcCode = `
  const handleRecalculateScores = async () => {
    if (activeTab !== 'active') return;
    setLoading(true);
    const toastId = toast.loading(t("Recalcul de tous les scores de pertinence..."));
    try {
      const token = await currentUser?.getIdToken(true);
      if (!token) throw new Error("Non authentifié");
      
      const res = await fetch('/api/admin/products/recalculate-scores', {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      
      if (!res.ok) throw new Error("Erreur serveur");

      await fetchProducts();
      toast.success(
        t("Tous les Scores de Pertinence ont été recalculés dynamiquement selon la formule de l'audit !"),
        { id: toastId }
      );
    } catch (err) {
      console.error(err);
      toast.error(t("Erreur durant recalcul."), { id: toastId });
    } finally {
      setLoading(false);
    }
  };`;

code = code.replace(/const handleApprove = async[\s\S]*?catch \(err\)[\s\S]*?  };/m, approveCode);
code = code.replace(/const handleRejectSubmit = async[\s\S]*?catch \(err\)[\s\S]*?  };/m, rejectCode);
code = code.replace(/const handleRecalculateScores = async[\s\S]*?catch \(err\)[\s\S]*?  };/m, recalcCode);

// Add useAuth if not there
if (!code.includes('useAuth()')) {
  code = code.replace("import { useTranslation } from \"react-i18next\";", "import { useTranslation } from \"react-i18next\";\nimport { useAuth } from \"../../context/AuthContext\";");
  code = code.replace("const { t, i18n } = useTranslation();", "const { t, i18n } = useTranslation();\n    const { currentUser } = useAuth();");
}

fs.writeFileSync('src/pages/Admin/ProductModeration.tsx', code);
