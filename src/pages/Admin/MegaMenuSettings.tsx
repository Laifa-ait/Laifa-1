import React, { useState, useEffect, useTransition } from "react";
import { useMegaMenu, FeaturedProduct, MegaMenuCategory, MegaMenuSubcategory, MegaMenuLink } from "../../context/MegaMenuContext";
import { useShop } from "../../context/ShopContext";
import {
  Save,
  Image as ImageIcon,
  Link as LinkIcon,
  ChevronRight,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit2,
  X,
  Check,
  Upload,
  Eye,
  Box,
  HelpCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Product, Language } from "../../types";
import { useTranslation } from "react-i18next";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../lib/firebase";
import { CATEGORY_ICONS } from "../../constants";
import { getTranslatedField } from "../../utils/translations";

export const MegaMenuSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar" || i18n.language?.startsWith("ar");
  const { categoriesData, setCategoriesData, saveMegaMenuToFirestore, isLoading } = useMegaMenu();
  const { fetchProductsByIds, fetchProductsByCategory } = useShop();

  const [activeTab, setActiveTab] = useState<"structure" | "featured">("structure");

  // Selection state for Structure Editor
  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [selectedSecName, setSelectedSecName] = useState<string>("");
  const [selectedLinkName, setSelectedLinkName] = useState<string>("");

  // Editing modals/fields
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  
  const [editingSecName, setEditingSecName] = useState<string | null>(null);
  const [editingSecNewName, setEditingSecNewName] = useState("");

  const [editingLinkName, setEditingLinkName] = useState<string | null>(null);
  const [editingLinkNewName, setEditingLinkNewName] = useState("");

  // Add forms state
  const [newCatName, setNewCatName] = useState("");
  const [newSecName, setNewSecName] = useState("");
  const [newLinkName, setNewLinkName] = useState("");

  // Product Link State
  const [productUrl, setProductUrl] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSearchingProducts, setIsSearchingProducts] = useState(false);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);

  // Preview state
  const [previewActiveCategory, setPreviewActiveCategory] = useState<string | null>(null);
  const [previewActiveSectionName, setPreviewActiveSectionName] = useState<string | null>(null);
  const [previewHoveredProduct, setPreviewHoveredProduct] = useState<FeaturedProduct | null>(null);
  const [productCache, setProductCache] = useState<Record<string, Product>>({});

  // 1. Initial selections
  useEffect(() => {
    if (categoriesData.length > 0) {
      if (!selectedCatId || !categoriesData.find((c) => c.id === selectedCatId)) {
        const firstCat = categoriesData[0];
        setSelectedCatId(firstCat.id);
        const firstSec = firstCat.sections[0];
        setSelectedSecName(firstSec?.name || "");
        setSelectedLinkName(firstSec?.links[0]?.name || "");
      }
    }
  }, [categoriesData, selectedCatId]);

  const currentCategory = categoriesData.find((cat) => cat.id === selectedCatId);
  const currentSection = currentCategory?.sections.find((sec) => sec.name === selectedSecName);
  const currentLink = currentSection?.links.find((link) => link.name === selectedLinkName);

  // Fetch products of current category to help selection
  useEffect(() => {
    if (currentCategory) {
      fetchProductsByCategory(currentCategory.name, 30).then((prods) => {
        setCategoryProducts(prods || []);
      });
    }
  }, [currentCategory, fetchProductsByCategory]);

  // Handle featured product URL changes
  useEffect(() => {
    if (currentLink && currentLink.featuredProduct) {
      setProductUrl(`/product/${currentLink.featuredProduct.productId}`);
    } else {
      setProductUrl("");
    }
  }, [currentLink]);

  const extractProductId = (url: string) => {
    const match = url.match(/\/product\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : url.trim();
  };

  const selectedProductId = extractProductId(productUrl);

  useEffect(() => {
    if (selectedProductId) {
      setIsSearchingProducts(true);
      fetchProductsByIds([selectedProductId])
        .then((prods) => {
          setSelectedProduct(prods[0] || null);
        })
        .finally(() => {
          setIsSearchingProducts(false);
        });
    } else {
      setSelectedProduct(null);
    }
  }, [selectedProductId, fetchProductsByIds]);

  // Cache products for real-time preview
  useEffect(() => {
    if (categoriesData.length === 0) return;
    const idsToFetch = new Set<string>();
    categoriesData.forEach((cat) => {
      if (cat.featuredProduct?.productId) {
        idsToFetch.add(cat.featuredProduct.productId);
      }
      cat.sections.forEach((sec) => {
        sec.links.forEach((link) => {
          if (link.featuredProduct?.productId) {
            idsToFetch.add(link.featuredProduct.productId);
          }
        });
      });
    });

    const neededIds = Array.from(idsToFetch).filter((id) => !productCache[id]);
    if (neededIds.length > 0) {
      fetchProductsByIds(neededIds).then((prods) => {
        setProductCache((prev) => {
          const next = { ...prev };
          prods.forEach((p) => {
            next[p.id] = p;
          });
          return next;
        });
      });
    }
  }, [categoriesData, fetchProductsByIds, productCache]);

  // Add / Edit / Delete Category functions
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const catName = newCatName.trim();
    const id = catName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    if (categoriesData.some((c) => c.name.toLowerCase() === catName.toLowerCase() || c.id === id)) {
      toast.error(t("Cette catégorie existe déjà"));
      return;
    }

    const newCat: MegaMenuCategory = {
      id,
      name: catName,
      sections: [],
    };

    setCategoriesData((prev) => [...prev, newCat]);
    setNewCatName("");
    setSelectedCatId(id);
    toast.success(t("Catégorie ajoutée"));
  };

  const handleRenameCategory = (catId: string) => {
    if (!editingCatName.trim()) return;
    setCategoriesData((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, name: editingCatName.trim() } : c))
    );
    setEditingCatId(null);
    toast.success(t("Catégorie renommée"));
  };

  const handleDeleteCategory = (catId: string) => {
    if (!window.confirm(t("Voulez-vous vraiment supprimer cette catégorie ? Cela supprimera toutes ses sous-catégories."))) {
      return;
    }
    setCategoriesData((prev) => prev.filter((c) => c.id !== catId));
    toast.success(t("Catégorie supprimée"));
  };

  // Add / Edit / Delete Sections (subcategories)
  const handleAddSection = () => {
    if (!selectedCatId || !newSecName.trim()) return;
    const secName = newSecName.trim();

    if (currentCategory?.sections.some((s) => s.name.toLowerCase() === secName.toLowerCase())) {
      toast.error(t("Cette section existe déjà"));
      return;
    }

    const newSec: MegaMenuSubcategory = {
      name: secName,
      links: [],
    };

    setCategoriesData((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCatId) return c;
        return {
          ...c,
          sections: [...c.sections, newSec],
        };
      })
    );
    setNewSecName("");
    setSelectedSecName(secName);
    toast.success(t("Section ajoutée"));
  };

  const handleRenameSection = (oldName: string) => {
    if (!editingSecNewName.trim() || !selectedCatId) return;
    setCategoriesData((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCatId) return c;
        return {
          ...c,
          sections: c.sections.map((s) =>
            s.name === oldName ? { ...s, name: editingSecNewName.trim() } : s
          ),
        };
      })
    );
    setSelectedSecName(editingSecNewName.trim());
    setEditingSecName(null);
    toast.success(t("Section renommée"));
  };

  const handleDeleteSection = (secName: string) => {
    if (!selectedCatId || !window.confirm(t("Supprimer cette section ?"))) return;
    setCategoriesData((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCatId) return c;
        return {
          ...c,
          sections: c.sections.filter((s) => s.name !== secName),
        };
      })
    );
    setSelectedSecName("");
    toast.success(t("Section supprimée"));
  };

  // Add / Edit / Delete Links
  const handleAddLink = () => {
    if (!selectedCatId || !selectedSecName || !newLinkName.trim()) return;
    const linkName = newLinkName.trim();

    if (currentSection?.links.some((l) => l.name.toLowerCase() === linkName.toLowerCase())) {
      toast.error(t("Ce lien existe déjà"));
      return;
    }

    const newLink: MegaMenuLink = {
      name: linkName,
    };

    setCategoriesData((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCatId) return c;
        return {
          ...c,
          sections: c.sections.map((s) => {
            if (s.name !== selectedSecName) return s;
            return {
              ...s,
              links: [...s.links, newLink],
            };
          }),
        };
      })
    );
    setNewLinkName("");
    setSelectedLinkName(linkName);
    toast.success(t("Lien de sous-catégorie ajouté"));
  };

  const handleRenameLink = (oldName: string) => {
    if (!editingLinkNewName.trim() || !selectedCatId || !selectedSecName) return;
    setCategoriesData((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCatId) return c;
        return {
          ...c,
          sections: c.sections.map((s) => {
            if (s.name !== selectedSecName) return s;
            return {
              ...s,
              links: s.links.map((l) =>
                l.name === oldName ? { ...l, name: editingLinkNewName.trim() } : l
              ),
            };
          }),
        };
      })
    );
    setSelectedLinkName(editingLinkNewName.trim());
    setEditingLinkName(null);
    toast.success(t("Lien renommé"));
  };

  const handleDeleteLink = (linkName: string) => {
    if (!selectedCatId || !selectedSecName || !window.confirm(t("Supprimer ce lien ?"))) return;
    setCategoriesData((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCatId) return c;
        return {
          ...c,
          sections: c.sections.map((s) => {
            if (s.name !== selectedSecName) return s;
            return {
              ...s,
              links: s.links.filter((l) => l.name !== linkName),
            };
          }),
        };
      })
    );
    setSelectedLinkName("");
    toast.success(t("Lien supprimé"));
  };

  // Reordering functions
  const moveCategory = (idx: number, direction: "up" | "down") => {
    const nextIdx = direction === "up" ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= categoriesData.length) return;

    const copy = [...categoriesData];
    const temp = copy[idx];
    copy[idx] = copy[nextIdx];
    copy[nextIdx] = temp;
    setCategoriesData(copy);
  };

  const moveSection = (idx: number, direction: "up" | "down") => {
    if (!currentCategory) return;
    const nextIdx = direction === "up" ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= currentCategory.sections.length) return;

    const updatedSections = [...currentCategory.sections];
    const temp = updatedSections[idx];
    updatedSections[idx] = updatedSections[nextIdx];
    updatedSections[nextIdx] = temp;

    setCategoriesData((prev) =>
      prev.map((c) => (c.id === selectedCatId ? { ...c, sections: updatedSections } : c))
    );
  };

  const moveLink = (idx: number, direction: "up" | "down") => {
    if (!currentCategory || !currentSection) return;
    const nextIdx = direction === "up" ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= currentSection.links.length) return;

    const updatedLinks = [...currentSection.links];
    const temp = updatedLinks[idx];
    updatedLinks[idx] = updatedLinks[nextIdx];
    updatedLinks[nextIdx] = temp;

    setCategoriesData((prev) =>
      prev.map((c) => {
        if (c.id !== selectedCatId) return c;
        return {
          ...c,
          sections: c.sections.map((s) =>
            s.name === selectedSecName ? { ...s, links: updatedLinks } : s
          ),
        };
      })
    );
  };

  // Custom icon & image upload with UUID to prevent collisions
  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>, catId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading(t("Upload de l'icône..."), { id: "icon-upload" });
      const uniqueFilename = `${crypto.randomUUID()}_${file.name.replace(/\s+/g, "_")}`;
      const storageRef = ref(storage, `megamenu_icons/${uniqueFilename}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      setCategoriesData((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, iconUrl: url } : c))
      );
      toast.success(t("Icône mise à jour ! ✨"), { id: "icon-upload" });
    } catch (err) {
      console.error(err);
      toast.error(t("Erreur de téléchargement"), { id: "icon-upload" });
    }
  };

  // Featured Product Linking Form Submit
  const handleFeaturedProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentCategory && currentSection && currentLink) {
      if (!selectedProductId) {
        setCategoriesData((prev) =>
          prev.map((c) => {
            if (c.id !== currentCategory.id) return c;
            return {
              ...c,
              sections: c.sections.map((s) => {
                if (s.name !== currentSection.name) return s;
                return {
                  ...s,
                  links: s.links.map((l) =>
                    l.name === currentLink.name ? { ...l, featuredProduct: undefined } : l
                  ),
                };
              }),
            };
          })
        );
        toast.success(t("Produit lié retiré"));
        return;
      }

      const product: FeaturedProduct = {
        productId: selectedProductId,
      };

      setCategoriesData((prev) =>
        prev.map((c) => {
          if (c.id !== currentCategory.id) return c;
          return {
            ...c,
            sections: c.sections.map((s) => {
              if (s.name !== currentSection.name) return s;
              return {
                ...s,
                links: s.links.map((l) =>
                  l.name === currentLink.name ? { ...l, featuredProduct: product } : l
                ),
              };
            }),
          };
        })
      );
      toast.success(t("Produit mis en avant lié !"));
    }
  };

  // Live preview helpers
  const activePreviewCatData = categoriesData.find((c) => c.id === previewActiveCategory);
  const displayPreviewProd = previewHoveredProduct || activePreviewCatData?.featuredProduct;
  const previewProductToDisplay = displayPreviewProd ? productCache[displayPreviewProd.productId] : null;

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-16 px-4 md:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 pb-6">
        <div>
          <h1 className="text-3xl font-kinder text-zinc-900 tracking-tighter uppercase flex items-center gap-3">
            <span>{t("Configuration du Mega Menu")}</span>
          </h1>
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mt-1">
            {t("Éditez la hiérarchie complète, réordonnez les éléments, associez des produits et uploadez des icônes")}
          </p>
        </div>

        <button
          onClick={() => saveMegaMenuToFirestore()}
          disabled={isLoading}
          className="bg-[#ea580c] hover:bg-[#c2410c] text-white font-kinder uppercase tracking-wider text-sm px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
        >
          <Save className="w-4 h-4" />
          {t("Sauvegarder sur Firestore")}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab("structure")}
          className={`py-4 px-6 font-kinder text-sm uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "structure"
              ? "border-[#ea580c] text-[#ea580c]"
              : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          {t("1. Structure & Icônes")}
        </button>
        <button
          onClick={() => setActiveTab("featured")}
          className={`py-4 px-6 font-kinder text-sm uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "featured"
              ? "border-[#ea580c] text-[#ea580c]"
              : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          {t("2. Produits en Vedette")}
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl border border-zinc-100 shadow-sm text-center">
          <p className="text-zinc-500 font-medium">{t("Chargement des données du Mega Menu...")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* TAB 1: STRUCTURE EDITOR */}
          {activeTab === "structure" && (
            <div className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1: Categories */}
              <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{t("Catégories Principales")}</h3>
                  <span className="text-[10px] bg-zinc-100 px-2 py-1 rounded-full text-zinc-600 font-bold">{categoriesData.length}</span>
                </div>

                {/* List */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {categoriesData.map((cat, idx) => (
                    <div
                      key={cat.id}
                      className={`group p-3 rounded-2xl border transition-all flex items-center justify-between ${
                        selectedCatId === cat.id
                          ? "bg-zinc-950 border-zinc-950 text-white"
                          : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSelectedCatId(cat.id);
                          const firstSec = cat.sections[0];
                          setSelectedSecName(firstSec?.name || "");
                          setSelectedLinkName(firstSec?.links[0]?.name || "");
                        }}
                        className="flex-1 text-start font-semibold text-xs flex items-center gap-2"
                      >
                        {cat.iconUrl ? (
                          <img src={cat.iconUrl} className="w-5 h-5 object-contain rounded" alt="" />
                        ) : (
                          <Box className="w-4 h-4 opacity-50" />
                        )}
                        <span>{cat.name}</span>
                      </button>

                      {/* Controls */}
                      <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveCategory(idx, "up")}
                          disabled={idx === 0}
                          className="p-1 hover:bg-zinc-800 rounded disabled:opacity-30"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveCategory(idx, "down")}
                          disabled={idx === categoriesData.length - 1}
                          className="p-1 hover:bg-zinc-800 rounded disabled:opacity-30"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCatId(cat.id);
                            setEditingCatName(cat.name);
                          }}
                          className="p-1 hover:bg-zinc-800 rounded text-blue-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1 hover:bg-zinc-800 rounded text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Edit Cat Modal Inline */}
                {editingCatId && (
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-2">
                    <label className="text-[10px] font-bold text-blue-600 uppercase">{t("Renommer la catégorie")}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="flex-1 bg-white border border-blue-200 outline-none px-3 py-1.5 rounded-xl text-xs"
                      />
                      <button
                        onClick={() => handleRenameCategory(editingCatId)}
                        className="p-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCatId(null)}
                        className="p-1.5 bg-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Add Form */}
                <div className="pt-2 border-t border-zinc-100 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">{t("Nouvelle Catégorie")}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t("Ex: Informatique") || "Ex: Informatique"}
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 bg-zinc-50 border border-zinc-200 outline-none px-3 py-2 rounded-xl text-xs"
                    />
                    <button
                      onClick={handleAddCategory}
                      className="px-3 py-2 bg-[#ea580c] text-white rounded-xl hover:bg-[#c2410c] flex items-center gap-1 text-xs font-bold uppercase"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Icon Image Upload for selected Category */}
                {currentCategory && (
                  <div className="pt-4 border-t border-zinc-100 space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" />
                      {t("Icône de catégorie")}
                    </label>
                    <div className="flex items-center gap-4 bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
                      <div className="w-10 h-10 bg-white border rounded-xl flex items-center justify-center overflow-hidden">
                        {currentCategory.iconUrl ? (
                          <img src={currentCategory.iconUrl} className="w-full h-full object-contain" alt="" />
                        ) : (
                          <Box className="w-5 h-5 text-zinc-400" />
                        )}
                      </div>
                      <label className="flex-1 cursor-pointer bg-white border hover:bg-zinc-100 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase text-zinc-700 text-center border-dashed border-zinc-300">
                        <Upload className="w-3.5 h-3.5 inline mr-1" />
                        {t("Uploader une icône")}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleIconUpload(e, currentCategory.id)}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2: Sections (Subcategories) */}
              <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {t("Sections de")} <span className="text-zinc-900 font-extrabold">{currentCategory?.name || t("Sélectionnée")}</span>
                  </h3>
                  <span className="text-[10px] bg-zinc-100 px-2 py-1 rounded-full text-zinc-600 font-bold">
                    {currentCategory?.sections.length || 0}
                  </span>
                </div>

                {currentCategory ? (
                  <div className="space-y-4">
                    {/* List */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {currentCategory.sections.map((sec, idx) => (
                        <div
                          key={sec.name}
                          className={`group p-3 rounded-2xl border transition-all flex items-center justify-between ${
                            selectedSecName === sec.name
                              ? "bg-orange-500 border-orange-500 text-white"
                              : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100"
                          }`}
                        >
                          <button
                            onClick={() => {
                              setSelectedSecName(sec.name);
                              setSelectedLinkName(sec.links[0]?.name || "");
                            }}
                            className="flex-1 text-start font-semibold text-xs"
                          >
                            {sec.name}
                          </button>

                          {/* Controls */}
                          <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => moveSection(idx, "up")}
                              disabled={idx === 0}
                              className="p-1 hover:bg-orange-600 rounded disabled:opacity-30"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveSection(idx, "down")}
                              disabled={idx === currentCategory.sections.length - 1}
                              className="p-1 hover:bg-orange-600 rounded disabled:opacity-30"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingSecName(sec.name);
                                setEditingSecNewName(sec.name);
                              }}
                              className="p-1 hover:bg-orange-600 rounded text-blue-200"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSection(sec.name)}
                              className="p-1 hover:bg-orange-600 rounded text-red-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Rename Section Modal Inline */}
                    {editingSecName && (
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-2">
                        <label className="text-[10px] font-bold text-blue-600 uppercase">{t("Renommer la section")}</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingSecNewName}
                            onChange={(e) => setEditingSecNewName(e.target.value)}
                            className="flex-1 bg-white border border-blue-200 outline-none px-3 py-1.5 rounded-xl text-xs"
                          />
                          <button
                            onClick={() => handleRenameSection(editingSecName)}
                            className="p-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingSecName(null)}
                            className="p-1.5 bg-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Add Section Form */}
                    <div className="pt-2 border-t border-zinc-100 space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">{t("Nouvelle Section")}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t("Ex: Ordinateurs de Bureau") || "Ex: Ordinateurs de Bureau"}
                          value={newSecName}
                          onChange={(e) => setNewSecName(e.target.value)}
                          className="flex-1 bg-zinc-50 border border-zinc-200 outline-none px-3 py-2 rounded-xl text-xs"
                        />
                        <button
                          onClick={handleAddSection}
                          className="px-3 py-2 bg-[#ea580c] text-white rounded-xl hover:bg-[#c2410c] flex items-center gap-1 text-xs font-bold uppercase"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 text-center py-8">{t("Sélectionnez d'abord une catégorie")}</p>
                )}
              </div>

              {/* Column 3: Links (Sub-subcategories) */}
              <div className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-100">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {t("Liens de")} <span className="text-zinc-900 font-extrabold">{selectedSecName || t("Sélectionnée")}</span>
                  </h3>
                  <span className="text-[10px] bg-zinc-100 px-2 py-1 rounded-full text-zinc-600 font-bold">
                    {currentSection?.links.length || 0}
                  </span>
                </div>

                {currentSection ? (
                  <div className="space-y-4">
                    {/* List */}
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {currentSection.links.map((link, idx) => (
                        <div
                          key={link.name}
                          className={`group p-3 rounded-2xl border transition-all flex items-center justify-between ${
                            selectedLinkName === link.name
                              ? "bg-zinc-200 border-zinc-300 text-zinc-900"
                              : "bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100"
                          }`}
                        >
                          <button
                            onClick={() => setSelectedLinkName(link.name)}
                            className="flex-1 text-start font-semibold text-xs flex items-center gap-2"
                          >
                            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                            <span>{link.name}</span>
                          </button>

                          {/* Controls */}
                          <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => moveLink(idx, "up")}
                              disabled={idx === 0}
                              className="p-1 hover:bg-zinc-300 rounded disabled:opacity-30 text-zinc-700"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveLink(idx, "down")}
                              disabled={idx === currentSection.links.length - 1}
                              className="p-1 hover:bg-zinc-300 rounded disabled:opacity-30 text-zinc-700"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingLinkName(link.name);
                                setEditingLinkNewName(link.name);
                              }}
                              className="p-1 hover:bg-zinc-300 rounded text-blue-600"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteLink(link.name)}
                              className="p-1 hover:bg-zinc-300 rounded text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Rename Link Modal Inline */}
                    {editingLinkName && (
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-2">
                        <label className="text-[10px] font-bold text-blue-600 uppercase">{t("Renommer le lien")}</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingLinkNewName}
                            onChange={(e) => setEditingLinkNewName(e.target.value)}
                            className="flex-1 bg-white border border-blue-200 outline-none px-3 py-1.5 rounded-xl text-xs"
                          />
                          <button
                            onClick={() => handleRenameLink(editingLinkName)}
                            className="p-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingLinkName(null)}
                            className="p-1.5 bg-zinc-200 text-zinc-600 rounded-xl hover:bg-zinc-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Add Link Form */}
                    <div className="pt-2 border-t border-zinc-100 space-y-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">{t("Nouveau Lien de sous-catégorie")}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={t("Ex: MacBook Pro") || "Ex: MacBook Pro"}
                          value={newLinkName}
                          onChange={(e) => setNewLinkName(e.target.value)}
                          className="flex-1 bg-zinc-50 border border-zinc-200 outline-none px-3 py-2 rounded-xl text-xs"
                        />
                        <button
                          onClick={handleAddLink}
                          className="px-3 py-2 bg-[#ea580c] text-white rounded-xl hover:bg-[#c2410c] flex items-center gap-1 text-xs font-bold uppercase"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 text-center py-8">{t("Sélectionnez d'abord une section")}</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FEATURED PRODUCTS EDITOR */}
          {activeTab === "featured" && (
            <div className="xl:col-span-12 grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Left Selector Columns */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm flex flex-col gap-2">
                  <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">
                    {t("1. Choisir la catégorie")}
                  </h2>
                  <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto">
                    {categoriesData.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setSelectedCatId(cat.id);
                          const firstSec = cat.sections[0];
                          setSelectedSecName(firstSec?.name || "");
                          setSelectedLinkName(firstSec?.links[0]?.name || "");
                        }}
                        className={`flex items-center justify-between px-4 py-3 rounded-2xl text-start text-xs font-semibold transition-all ${
                          selectedCatId === cat.id
                            ? "bg-zinc-950 text-white shadow-md"
                            : "text-zinc-600 hover:bg-zinc-50 border border-transparent"
                        }`}
                      >
                        <span>{cat.name}</span>
                        {cat.featuredProduct && (
                          <span className="w-2 h-2 rounded-full bg-orange-500" title={t("Possède un produit vedette")} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {currentCategory && (
                  <div className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm flex flex-col gap-2">
                    <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">
                      {t("2. Choisir la section")}
                    </h2>
                    <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                      {currentCategory.sections.map((sec) => (
                        <button
                          key={sec.name}
                          onClick={() => {
                            setSelectedSecName(sec.name);
                            setSelectedLinkName(sec.links[0]?.name || "");
                          }}
                          className={`flex items-center justify-between px-4 py-3 rounded-2xl text-start text-xs font-semibold transition-all ${
                            selectedSecName === sec.name
                              ? "bg-orange-500 text-white shadow-md"
                              : "text-zinc-600 hover:bg-zinc-50 border border-transparent"
                          }`}
                        >
                          <span>{sec.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentSection && (
                  <div className="bg-white p-4 rounded-3xl border border-zinc-100 shadow-sm flex flex-col gap-2">
                    <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">
                      {t("3. Choisir le lien de sous-catégorie")}
                    </h2>
                    <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                      {currentSection.links.map((link) => (
                        <button
                          key={link.name}
                          onClick={() => setSelectedLinkName(link.name)}
                          className={`flex items-center justify-between px-4 py-3 rounded-2xl text-start text-xs font-semibold transition-all ${
                            selectedLinkName === link.name
                              ? "bg-zinc-200 text-zinc-900"
                              : "text-zinc-500 hover:bg-zinc-50 border border-transparent"
                          }`}
                        >
                          <span>{link.name}</span>
                          {link.featuredProduct && (
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Linking Form & Helper Search */}
              <div className="lg:col-span-3">
                {currentLink ? (
                  <div className="bg-white rounded-3xl p-8 border border-zinc-100 shadow-sm space-y-8">
                    <div className="border-b border-zinc-100 pb-6">
                      <h2 className="text-xl font-kinder text-zinc-900">{t("Lier un produit en vedette")}</h2>
                      <p className="text-sm text-zinc-500 mt-1">
                        {t("Sélectionnez le produit qui sera affiché en bento au survol de")}
                        <span className="font-bold text-zinc-900 mx-1">« {currentLink.name} »</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                      <form onSubmit={handleFeaturedProductSubmit} className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold tracking-wider uppercase text-zinc-500 flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-orange-500" />
                            {t("Lien du produit ou ID")}
                          </label>
                          <input
                            type="text"
                            value={productUrl}
                            onChange={(e) => setProductUrl(e.target.value)}
                            className="w-full bg-zinc-50 border border-zinc-200 outline-none px-4 py-3 rounded-xl text-sm font-semibold text-zinc-900 focus:border-zinc-400 transition-colors"
                            placeholder={t("Ex: /product/123 ou ID du produit") || "Ex: /product/123 ou ID du produit"}
                          />
                          <p className="text-[10px] uppercase font-bold text-zinc-400 mt-2">
                            {t("Copiez-collez l'URL de la fiche produit ou choisissez parmi la liste d'aide ci-dessous.")}
                          </p>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-kinder uppercase tracking-wider text-sm py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20"
                        >
                          <Save className="w-4 h-4" />
                          {t("Associer le produit")}
                        </button>

                        {/* Helper Selector list */}
                        <div className="pt-6 border-t border-zinc-100">
                          <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
                            {t("Sélection rapide (Produits de la catégorie")} « {currentCategory?.name} »)
                          </h4>
                          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                            {categoryProducts.length === 0 ? (
                              <p className="text-xs text-zinc-400 italic">{t("Aucun produit trouvé dans cette catégorie")}</p>
                            ) : (
                              categoryProducts.map((p) => (
                                <button
                                  type="button"
                                  key={p.id}
                                  onClick={() => setProductUrl(`/product/${p.id}`)}
                                  className="w-full text-start p-2 rounded-xl border border-zinc-100 hover:bg-zinc-50 flex items-center gap-3 transition-colors text-xs"
                                >
                                  <img src={p.images?.[0] || p.image} className="w-8 h-8 object-cover rounded" alt="" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-zinc-800 truncate">{getTranslatedField(p, "name", i18n.language as Language)}</p>
                                    <p className="text-[10px] font-bold text-orange-600">{p.price.toLocaleString("fr-DZ")} DA</p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </form>

                      {/* Real-time Preview */}
                      <div className="flex flex-col h-full ps-0 md:ps-12 md:border-l border-zinc-100">
                        <h3 className="text-xs font-bold tracking-wider text-zinc-400 mb-4 uppercase">
                          {t("Visualisation du produit")}
                        </h3>
                        <div className="group flex flex-col pointer-events-none relative rounded-3xl overflow-hidden w-[240px] aspect-[4/5] bg-zinc-50 shadow-md">
                          {isSearchingProducts ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                                {t("Recherche en cours...")}
                              </span>
                            </div>
                          ) : selectedProduct ? (
                            <>
                              <img
                                loading="lazy"
                                src={selectedProduct.images?.[0] || selectedProduct.image}
                                alt={selectedProduct.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/40 to-transparent" />

                              <div className="absolute bottom-6 start-5 end-5 flex flex-col text-white">
                                <h4 className="text-[16px] font-bold leading-tight mb-2 line-clamp-2">
                                  {getTranslatedField(selectedProduct, "name", i18n.language as Language)}
                                </h4>
                                <div className="flex items-center justify-between">
                                  <span className="text-base font-extrabold text-orange-500">
                                    {selectedProduct.price.toLocaleString("fr-DZ")} {t("DA")}
                                  </span>
                                  <div className="px-3 py-1.5 bg-white text-zinc-950 rounded-xl font-kinder text-[9px] uppercase tracking-wider">
                                    {t("Découvrir")}
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 p-4 text-center">
                              <Box className="w-8 h-8 opacity-20 mb-2" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">
                                {t("Aucun produit associé ou introuvable")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-12 rounded-3xl border border-zinc-100 shadow-sm text-center">
                    <p className="text-zinc-500 font-medium">
                      {t("Sélectionnez une sous-catégorie pour lui lier son produit en vedette.")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REAL-TIME PREVIEW OF THE MEGA MENU (Saves endless navigation testing) */}
          <div className="xl:col-span-12 bg-[#FDF9EC] p-6 rounded-3xl border border-[#FF5C00]/20 shadow-lg mt-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#3C2B22]/10 pb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#FF5C00]" />
                <h3 className="font-kinder text-sm uppercase text-[#3C2B22] tracking-wider">
                  {t("Aperçu interactif en temps réel (Comme sur la vitrine client)")}
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-[#3C2B22]/60">
                {t("Passez ou cliquez sur les catégories ci-dessous pour ouvrir le tiroir")}
              </span>
            </div>

            {/* Menu Header Bar */}
            <div className="relative w-full text-[#3C2B22]">
              <div className="max-w-[1600px] mx-auto">
                <ul className="flex items-center justify-between overflow-x-auto scrollbar-hide py-1">
                  {categoriesData.map((category) => {
                    const IconComponent = CATEGORY_ICONS[category.name] || Box;
                    const isActive = previewActiveCategory === category.id;

                    return (
                      <li key={category.id} className="relative shrink-0">
                        <button
                          onClick={() => {
                            setPreviewActiveCategory((prev) => (prev === category.id ? null : category.id));
                            setPreviewActiveSectionName(category.sections[0]?.name || null);
                            setPreviewHoveredProduct(null);
                          }}
                          className="py-2.5 px-3 transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center"
                        >
                          <span
                            className={`flex flex-col items-center justify-center gap-1 ${
                              isActive ? "text-[#FF5C00]" : "text-[#3C2B22]/80 hover:text-[#FF5C00]"
                            }`}
                          >
                            {category.iconUrl ? (
                              <img src={category.iconUrl} className="w-7 h-7 object-contain" alt="" />
                            ) : (
                              <IconComponent className="w-7 h-7 stroke-[1.5]" />
                            )}
                            <span className="text-[10px] font-bold uppercase mt-1">{category.name}</span>
                          </span>
                        </button>
                        {isActive && (
                          <div className="absolute bottom-0 start-0 w-full h-[3px] bg-[#FF5C00] rounded-t-full" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Mega Drawer preview */}
              {previewActiveCategory && activePreviewCatData && (
                <div className="absolute top-full left-0 right-0 bg-[#FDF9EC] text-[#3C2B22] border-t border-[#FF5C00] shadow-2xl rounded-2xl mt-2 p-8 z-30 transition-all">
                  <div className="grid grid-cols-12 gap-8">
                    {/* Sections column */}
                    <div className="col-span-3 border-r border-[#3C2B22]/10 pr-4">
                      <h4 className="text-xs font-bold text-[#3C2B22]/60 uppercase tracking-widest mb-4">
                        {t("Sous-catégories")}
                      </h4>
                      <div className="space-y-1">
                        {activePreviewCatData.sections.map((sec) => (
                          <button
                            key={sec.name}
                            onMouseEnter={() => {
                              setPreviewActiveSectionName(sec.name);
                              setPreviewHoveredProduct(null);
                            }}
                            className={`w-full text-start p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                              previewActiveSectionName === sec.name
                                ? "bg-black text-white"
                                : "text-zinc-600 hover:bg-zinc-100"
                            }`}
                          >
                            <span>{sec.name}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Links column */}
                    <div className="col-span-6 px-4">
                      <h4 className="text-xs font-bold text-[#3C2B22]/60 uppercase tracking-widest mb-4">
                        {previewActiveSectionName || t("Explorer")}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        {activePreviewCatData.sections
                          .find((s) => s.name === previewActiveSectionName)
                          ?.links.map((link) => (
                            <div
                              key={link.name}
                              onMouseEnter={() => {
                                if (link.featuredProduct) {
                                  setPreviewHoveredProduct(link.featuredProduct);
                                }
                              }}
                              className="p-2 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer text-xs font-medium text-zinc-700 hover:text-black flex justify-between items-center"
                            >
                              <span>{link.name}</span>
                              {link.featuredProduct && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />}
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Featured Product column */}
                    <div className="col-span-3 pl-4 border-l border-[#3C2B22]/10 flex flex-col justify-between">
                      <h4 className="text-xs font-bold text-[#3C2B22]/60 uppercase tracking-widest mb-4">
                        {t("En vedette")}
                      </h4>

                      {previewProductToDisplay ? (
                        <div className="bg-white rounded-2xl overflow-hidden shadow border border-zinc-100 p-2 flex flex-col">
                          <img
                            src={previewProductToDisplay.images?.[0] || previewProductToDisplay.image}
                            className="w-full aspect-[4/3] object-cover rounded-xl"
                            alt=""
                          />
                          <div className="p-3">
                            <h5 className="font-bold text-xs text-zinc-900 line-clamp-1">
                              {getTranslatedField(previewProductToDisplay, "name", i18n.language as Language)}
                            </h5>
                            <p className="text-orange-600 font-extrabold text-xs mt-1">
                              {previewProductToDisplay.price.toLocaleString("fr-DZ")} {t("DA")}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 text-center text-xs italic">
                          <HelpCircle className="w-6 h-6 opacity-40 mb-1" />
                          <p>{t("Aucun produit à afficher")}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
