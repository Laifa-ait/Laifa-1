import React, { useState, useEffect, useMemo } from 'react';
import { Database, Search, Download, Settings, RefreshCw, FileCode, CheckCircle, Flame, MapPin, Sliders, Play, Info, Key, Server, BarChart2, BookOpen } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { SearchSynonyms } from './SearchSynonyms';
import { SearchAnalytics } from './SearchAnalytics';
import toast from 'react-hot-toast';

interface SearchIndexingModel {
  objectID: string;
  name: string;
  name_arab?: string;
  name_english?: string;
  description: string;
  price: number;
  promoPrice?: number;
  hasPromo: boolean;
  category: string;
  subcategory?: string;
  image: string;
  rating: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  stockCount: number;
  wilaya: string;
  sellerId: string;
  sellerName?: string;
  tags: string[];
  createdAt_timestamp: number;
  rankingScore: number;
}

export const SearchIndexAdmin: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar' || i18n.language?.startsWith('ar');
  const [activeTab, setActiveTab] = useState<'index' | 'synonyms' | 'analytics'>('index');

  // Products State (Real Firestore + fallback to Demo if empty)
  const [products, setProducts] = useState<any[]>([]);
  const [isFetchingProducts, setIsFetchingProducts] = useState(true);
  const [usingDemoData, setUsingDemoData] = useState(false);

  // Configuration Credentials State
  const [selectedFormat, setSelectedFormat] = useState<'algolia' | 'typesense' | 'elasticsearch'>('algolia');
  const [algoliaAppId, setAlgoliaAppId] = useState('');
  const [algoliaAdminKey, setAlgoliaAdminKey] = useState('');
  const [algoliaIndexName, setAlgoliaIndexName] = useState('');
  const [typesenseHost, setTypesenseHost] = useState('');
  const [typesenseApiKey, setTypesenseApiKey] = useState('');
  const [typesenseCollection, setTypesenseCollection] = useState('');

  // Tuning Weights state
  const [weightTitle, setWeightTitle] = useState<number>(10);
  const [weightDesc, setWeightDesc] = useState<number>(4);
  const [weightRatings, setWeightRatings] = useState<number>(5);
  const [weightPromo, setWeightPromo] = useState<number>(3);
  const [weightStock, setWeightStock] = useState<number>(2);

  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [selectedWilaya, setSelectedWilaya] = useState<string>('Tous');
  const [simulatedSearch, setSimulatedSearch] = useState<string>('');
  const [exportedStatus, setExportedStatus] = useState<string>('');
  const [isIndexing, setIsIndexing] = useState(false);

  // Load products & credentials on mount
  useEffect(() => {
    let isCancelled = false;
    const initData = async () => {
      try {
        // Load credentials
        const credSnap = await getDoc(doc(db, "settings", "search_credentials"));
        if (credSnap.exists()) {
          const creds = credSnap.data();
          if (creds.selectedFormat) setSelectedFormat(creds.selectedFormat);
          if (creds.algoliaAppId) setAlgoliaAppId(creds.algoliaAppId);
          if (creds.algoliaAdminKey) setAlgoliaAdminKey(creds.algoliaAdminKey);
          if (creds.algoliaIndexName) setAlgoliaIndexName(creds.algoliaIndexName);
          if (creds.typesenseHost) setTypesenseHost(creds.typesenseHost);
          if (creds.typesenseApiKey) setTypesenseApiKey(creds.typesenseApiKey);
          if (creds.typesenseCollection) setTypesenseCollection(creds.typesenseCollection);
        }

        // Load actual products
        const prodSnap = await getDocs(collection(db, "products"));
        const fetchedProds: any[] = [];
        prodSnap.forEach((docSnap) => {
          fetchedProds.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (!isCancelled) {
          if (fetchedProds.length > 0) {
            setProducts(fetchedProds);
            setUsingDemoData(false);
          } else {
            setProducts([]);
            setUsingDemoData(true);
          }
        }
      } catch (err) {
        console.error("Error initializing search index settings:", err);
        if (!isCancelled) {
          setProducts([]);
          setUsingDemoData(true);
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingProducts(false);
        }
      }
    };
    initData();
    return () => {
      isCancelled = true;
    };
  }, []);

  const saveCredentials = async () => {
    try {
      toast.loading(t("Enregistrement des identifiants..."), { id: "save-creds" });
      await setDoc(doc(db, "settings", "search_credentials"), {
        selectedFormat,
        algoliaAppId,
        algoliaAdminKey,
        algoliaIndexName,
        typesenseHost,
        typesenseApiKey,
        typesenseCollection,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      toast.success(t("Identifiants enregistrés ! ✨"), { id: "save-creds" });
    } catch (err) {
      console.error(err);
      toast.error(t("Erreur de sauvegarde"), { id: "save-creds" });
    }
  };

  // Extract categories & wilayas from available products
  const { categories, wilayas } = useMemo(() => {
    const cats = new Set<string>();
    const wils = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
      if (p.wilaya) wils.add(p.wilaya);
    });
    return {
      categories: ['Tous', ...Array.from(cats)],
      wilayas: ['Tous', ...Array.from(wils)]
    };
  }, [products]);

  // Model products according to the search indexing model schema
  const modeledRecords: SearchIndexingModel[] = useMemo(() => {
    return products.map(p => {
      let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      const stock = typeof p.stock === 'number' ? p.stock : (p.stockCount || 0);
      if (stock <= 0) stockStatus = 'out_of_stock';
      else if (stock <= 4) stockStatus = 'low_stock';

      const baseRatingBonus = (p.rating || 0) * weightRatings * 1.5;
      const promoBonus = p.promoPrice ? weightPromo * 5 : 0;
      const stockBonus = stock > 0 ? weightStock * 3 : 0;
      const calculatedRankingScore = Math.round(100 + baseRatingBonus + promoBonus + stockBonus);

      return {
        objectID: p.id,
        name: p.name || '',
        name_arab: p.translations?.ar?.name || p.name_arab || `${p.name} (ترجمة)`,
        name_english: p.translations?.en?.name || p.name_english || p.name,
        description: p.description || '',
        price: p.price || 0,
        promoPrice: p.promoPrice,
        hasPromo: !!p.promoPrice,
        category: p.category || 'Tous',
        subcategory: p.subcategory || '',
        image: p.images?.[0] || p.image || '',
        rating: p.rating || 0,
        stockStatus,
        stockCount: stock,
        wilaya: p.wilaya || 'Tous',
        sellerId: p.sellerId || '',
        sellerName: p.sellerName || 'Artisan Olma',
        tags: p.tags || [],
        createdAt_timestamp: p.createdAt ? new Date(p.createdAt).getTime() / 1000 : Math.floor(Date.now() / 1000),
        rankingScore: calculatedRankingScore
      };
    });
  }, [products, weightRatings, weightPromo, weightStock]);

  const filteredRecords = useMemo(() => {
    return modeledRecords.filter(rec => {
      const matchCat = selectedCategory === 'Tous' || rec.category === selectedCategory;
      const matchWilaya = selectedWilaya === 'Tous' || rec.wilaya === selectedWilaya;
      return matchCat && matchWilaya;
    });
  }, [modeledRecords, selectedCategory, selectedWilaya]);

  // Simulated instant search ranker matching logic
  const simulatedResults = useMemo(() => {
    if (!simulatedSearch.trim()) return filteredRecords.slice(0, 4);
    const queryLower = simulatedSearch.trim().toLowerCase();
    
    return filteredRecords
      .map(rec => {
        let score = 0;
        if (rec.name.toLowerCase().includes(queryLower)) score += 100 * weightTitle;
        if (rec.description.toLowerCase().includes(queryLower)) score += 30 * weightDesc;
        if (rec.category.toLowerCase().includes(queryLower)) score += 50;
        score += rec.rankingScore;
        return { rec, matchScore: score };
      })
      .filter(item => item.matchScore > item.rec.rankingScore)
      .sort((a, b) => b.matchScore - a.matchScore)
      .map(item => ({
        ...item.rec,
        rankingScore: item.matchScore
      }));
  }, [filteredRecords, simulatedSearch, weightTitle, weightDesc]);

  // Export mapping config schemas snippet
  const configSchemaSnippet = useMemo(() => {
    if (selectedFormat === 'algolia') {
      return JSON.stringify({
        index_settings: {
          searchableAttributes: [`unordered(name)`, `unordered(name_english)`, `unordered(name_arab)`, `unordered(description)`, `tags`, `category`],
          attributesForFaceting: [`searchable(category)`, `searchable(subcategory)`, `searchable(wilaya)`, `filterOnly(stockStatus)`, `filterOnly(hasPromo)`],
          customRanking: [`desc(rankingScore)`, `desc(rating)`, `desc(createdAt_timestamp)`],
          renderingContent: { facetOrdering: { facets: { order: ["category", "wilaya", "stockStatus"] } } }
        }
      }, null, 2);
    } else if (selectedFormat === 'typesense') {
      return JSON.stringify({
        name: "products",
        fields: [
          { name: "id", type: "string" }, { name: "name", type: "string" }, { name: "name_arab", type: "string", optional: true },
          { name: "name_english", type: "string", optional: true }, { name: "description", type: "string" },
          { name: "price", type: "int32", facet: true }, { name: "rating", type: "float", facet: true },
          { name: "category", type: "string", facet: true }, { name: "wilaya", type: "string", facet: true },
          { name: "stockStatus", type: "string", facet: true }, { name: "rankingScore", type: "int32" }
        ],
        default_sorting_field: "rankingScore"
      }, null, 2);
    } else {
      return JSON.stringify({
        mappings: {
          properties: {
            name: { type: "text", analyzer: "french" }, name_arab: { type: "text", analyzer: "arabic" },
            name_english: { type: "text", analyzer: "english" }, description: { type: "text", analyzer: "french" },
            price: { type: "double" }, category: { type: "keyword" }, wilaya: { type: "keyword" }, rankingScore: { type: "integer" }
          }
        }
      }, null, 2);
    }
  }, [selectedFormat]);

  // Trigger JSON lines file download
  const handleDownloadExport = () => {
    try {
      let exportPayload = "";
      if (selectedFormat === 'algolia') {
        exportPayload = JSON.stringify({
          records: filteredRecords,
          settings: JSON.parse(configSchemaSnippet)
        }, null, 2);
      } else if (selectedFormat === 'typesense') {
        exportPayload = filteredRecords.map(r => JSON.stringify(r)).join("\n");
      } else {
        exportPayload = JSON.stringify(filteredRecords, null, 2);
      }

      const blob = new Blob([exportPayload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `olma_export_search_${selectedFormat}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setExportedStatus(t("Exportation réussie de {{count}} produits !", { count: filteredRecords.length }));
      setTimeout(() => setExportedStatus(''), 5000);
    } catch (err) {
      console.error(err);
      toast.error(t("Erreur de téléchargement"));
    }
  };

  // Push index records to search provider instantly!
  const handleIndexPush = async () => {
    if (selectedFormat === 'algolia') {
      if (!algoliaAppId || !algoliaAdminKey || !algoliaIndexName) {
        toast.error(t("Veuillez configurer et enregistrer vos clés d'API Algolia Admin."));
        return;
      }
      setIsIndexing(true);
      toast.loading(t("Upload des produits vers l'index Algolia..."), { id: "indexing-push" });

      try {
        const batchUrl = `https://${algoliaAppId}.algolia.net/1/indexes/${algoliaIndexName}/batch`;
        const requests = filteredRecords.map(rec => ({
          action: "updateObject",
          body: rec
        }));

        const res = await fetch(batchUrl, {
          method: "POST",
          headers: {
            "X-Algolia-Application-Id": algoliaAppId,
            "X-Algolia-API-Key": algoliaAdminKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ requests })
        });

        if (!res.ok) throw new Error(await res.text());

        toast.success(t("Indexation réussie ! {{count}} produits poussés sur Algolia. 🚀✨", { count: filteredRecords.length }), { id: "indexing-push" });
      } catch (err: any) {
        console.error(err);
        toast.error(`${t("Échec de l'indexation :")} ${err.message || err}`, { id: "indexing-push" });
      } finally {
        setIsIndexing(false);
      }
    } else {
      toast.error(t("L'indexation directe en un clic est actuellement supportée pour Algolia. Pour d'autres, utilisez l'exportation JSON."));
    }
  };

  return (
    <div className="space-y-10 max-w-[1850px] mx-auto p-4 md:p-8" id="search-index-admin-dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-200 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-orange-600" />
            <span className="text-xs font-kinder text-orange-600 uppercase tracking-widest">{t("Moteurs de Recherche Intel-Search")}</span>
          </div>
          <h1 className="text-3xl font-kinder tracking-tight text-zinc-900 uppercase">{t("Configuration & Modélisation de Recherche")}</h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
            {t("Connectez Algolia, configurez vos synonymes, réglez les poids de tri et suivez l'analytics de recherche.")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {usingDemoData && (
            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-full uppercase font-bold tracking-wider">
              ⚠️ {t("Mode Démo (Firestore Vide)")}
            </span>
          )}
          <button
            onClick={handleDownloadExport}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-all border-none shadow-md"
          >
            <Download className="w-4 h-4 text-[#ea580c]" />
            {t("Exporter")} ({filteredRecords.length})
          </button>
        </div>
      </div>

      {exportedStatus && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">{exportedStatus}</p>
        </div>
      )}

      {/* Internal Navigation Tabs */}
      <div className="flex border-b border-zinc-200 gap-2">
        <button
          onClick={() => setActiveTab("index")}
          className={`py-4 px-6 font-kinder text-sm uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "index" ? "border-[#ea580c] text-[#ea580c]" : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <Server className="w-4 h-4" />
          {t("1. Indexation & Connecteurs")}
        </button>
        <button
          onClick={() => setActiveTab("synonyms")}
          className={`py-4 px-6 font-kinder text-sm uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "synonyms" ? "border-[#ea580c] text-[#ea580c]" : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          {t("2. Synonymes")}
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`py-4 px-6 font-kinder text-sm uppercase tracking-wider border-b-2 flex items-center gap-2 transition-all ${
            activeTab === "analytics" ? "border-[#ea580c] text-[#ea580c]" : "border-transparent text-zinc-500 hover:text-zinc-900"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          {t("3. Analytics de Recherche")}
        </button>
      </div>

      {isFetchingProducts ? (
        <div className="bg-white p-12 border rounded-3xl text-center shadow-sm">
          <RefreshCw className="w-8 h-8 animate-spin text-zinc-400 mx-auto mb-3" />
          <p className="text-zinc-500 font-medium">{t("Synchronisation avec votre catalogue Firestore...")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {activeTab === "index" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left configurations (8 cols) */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Connectors Credentials */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                  <h2 className="text-lg font-kinder uppercase text-zinc-900 flex items-center gap-3">
                    <Key className="w-5 h-5 text-orange-500" />
                    {t("Connexion Réelle Algolia / Typesense")}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-100 p-1.5 rounded-2xl">
                    {(['algolia', 'typesense', 'elasticsearch'] as const).map(format => (
                      <button
                        key={format}
                        onClick={() => setSelectedFormat(format)}
                        className={`py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer ${
                          selectedFormat === format ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-950 bg-transparent'
                        }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>

                  {selectedFormat === 'algolia' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">{t("Algolia APP ID")}</label>
                        <input
                          type="text"
                          value={algoliaAppId}
                          onChange={(e) => setAlgoliaAppId(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 outline-none px-4 py-3 rounded-xl text-xs font-semibold"
                          placeholder="Ex: AB12CD34EF"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">{t("Algolia Admin API Key")}</label>
                        <input
                          type="password"
                          value={algoliaAdminKey}
                          onChange={(e) => setAlgoliaAdminKey(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 outline-none px-4 py-3 rounded-xl text-xs font-semibold"
                          placeholder="••••••••••••••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">{t("Algolia Index Name")}</label>
                        <input
                          type="text"
                          value={algoliaIndexName}
                          onChange={(e) => setAlgoliaIndexName(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 outline-none px-4 py-3 rounded-xl text-xs font-semibold"
                          placeholder="Ex: production_products"
                        />
                      </div>
                    </div>
                  )}

                  {selectedFormat === 'typesense' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">{t("Host URL")}</label>
                        <input
                          type="text"
                          value={typesenseHost}
                          onChange={(e) => setTypesenseHost(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 outline-none px-4 py-3 rounded-xl text-xs font-semibold"
                          placeholder="Ex: https://typesense.cloud"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">{t("API Key")}</label>
                        <input
                          type="password"
                          value={typesenseApiKey}
                          onChange={(e) => setTypesenseApiKey(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 outline-none px-4 py-3 rounded-xl text-xs font-semibold"
                          placeholder="••••••••••••••••••••"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">{t("Collection Name")}</label>
                        <input
                          type="text"
                          value={typesenseCollection}
                          onChange={(e) => setTypesenseCollection(e.target.value)}
                          className="w-full bg-zinc-50 border border-zinc-200 outline-none px-4 py-3 rounded-xl text-xs font-semibold"
                          placeholder="Ex: products"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 border-t border-zinc-100 pt-4 justify-between">
                    <button
                      onClick={saveCredentials}
                      className="px-5 py-3 bg-zinc-950 text-white rounded-xl text-xs font-bold uppercase hover:bg-zinc-800"
                    >
                      {t("Enregistrer les Clés")}
                    </button>

                    {selectedFormat === 'algolia' && (
                      <button
                        onClick={handleIndexPush}
                        disabled={isIndexing}
                        className="px-5 py-3 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-xl text-xs font-bold uppercase flex items-center gap-2 shadow-lg shadow-orange-500/20"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isIndexing ? 'animate-spin' : ''}`} />
                        {t("Lancer l'indexation Algolia")}
                      </button>
                    )}
                  </div>
                </div>

                {/* Settings & Filters */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
                  <h2 className="text-lg font-kinder uppercase text-zinc-900 flex items-center gap-3">
                    <Settings className="w-5 h-5 text-zinc-400" />
                    {t("Filtres de Scope d'exportation")}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-kinder text-zinc-400 uppercase mb-2">{t("Catégorie")}</label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-zinc-100 border border-transparent rounded-2xl px-4 py-3 text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-300 transition-all"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-kinder text-zinc-400 uppercase mb-2">{t("Wilaya")}</label>
                      <select
                        value={selectedWilaya}
                        onChange={(e) => setSelectedWilaya(e.target.value)}
                        className="w-full bg-zinc-100 border border-transparent rounded-2xl px-4 py-3 text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-300 transition-all"
                      >
                        {wilayas.map(wil => (
                          <option key={wil} value={wil}>{wil}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Config schema JSON code output */}
                <div className="bg-zinc-950 text-zinc-300 rounded-3xl p-6 md:p-8 shadow-xl">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
                    <div className="flex items-center gap-3">
                      <FileCode className="w-5 h-5 text-[#ea580c]" />
                      <div>
                        <h2 className="text-sm font-kinder text-white uppercase">{t("Schéma d'Index")}</h2>
                        <p className="text-[10px] text-zinc-500 font-mono">schema-{selectedFormat}.json</p>
                      </div>
                    </div>
                  </div>
                  <pre className="text-xs bg-zinc-900 p-6 rounded-2xl overflow-x-auto text-emerald-400 font-mono border border-zinc-800 max-h-72">
                    <code>{configSchemaSnippet}</code>
                  </pre>
                </div>

                {/* List of mapped real products to export */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm">
                  <h3 className="text-lg font-kinder uppercase text-zinc-900 mb-6">
                    {t("Documents Prêts à l'indexation ({{count}})", { count: filteredRecords.length })}
                  </h3>
                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                    {filteredRecords.map((doc) => (
                      <div key={doc.objectID} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-150 hover:border-zinc-300 transition-all">
                        <div className="flex items-center gap-4">
                          <img
                            loading="lazy"
                            src={doc.image}
                            alt={doc.name}
                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <h4 className="text-xs font-kinder text-zinc-900 leading-tight">{doc.name}</h4>
                            <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase">
                              ID: {doc.objectID} • {doc.category}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[9px] font-semibold bg-zinc-200 text-zinc-800 px-2 py-0.5 rounded-full uppercase">
                                {doc.wilaya}
                              </span>
                              {doc.hasPromo && (
                                <span className="text-[9px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                                  <Flame className="w-2.5 h-2.5" /> {t("Promo")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex sm:flex-col items-end gap-2 shrink-0 sm:text-end">
                          <span className="text-xs font-kinder text-zinc-900">
                            {doc.price.toLocaleString("fr-DZ")} DA
                          </span>
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded font-mono">
                            {doc.rankingScore} pts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right panel with Tri Weights sliders & Simulator (4 cols) */}
              <div className="lg:col-span-4 space-y-8">
                
                {/* Search Simulator */}
                <div className="bg-white border border-zinc-900 rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden">
                  <h3 className="text-base font-kinder uppercase text-zinc-900 flex items-center gap-2 mb-2">
                    <Play className="w-5 h-5 text-[#ea580c] fill-[#ea580c]" />
                    {t("Simulateur de Pertinence")}
                  </h3>
                  <p className="text-xs text-zinc-500 mb-6">{t("Testez le tri de pertinence en fonction des curseurs ci-dessous.")}</p>

                  <div className="relative mb-6">
                    <input
                      type="text"
                      placeholder={t("Ex: Poterie, cuir, bijoux...") || "Ex: Poterie, cuir, bijoux..."}
                      value={simulatedSearch}
                      onChange={(e) => setSimulatedSearch(e.target.value)}
                      className="w-full bg-zinc-100 border border-transparent rounded-2xl ps-10 pe-4 py-3 text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-300 transition-all"
                    />
                    <Search className="w-4 h-4 text-zinc-400 absolute start-4 top-3.5" />
                  </div>

                  <div className="space-y-4">
                    {simulatedResults.length === 0 ? (
                      <div className="text-center py-6 bg-zinc-50 rounded-2xl text-xs text-zinc-400 font-semibold uppercase">
                        {t("Aucun résultat")}
                      </div>
                    ) : (
                      simulatedResults.map((item, index) => (
                        <div key={item.objectID} className="p-3 bg-zinc-50 rounded-xl border border-zinc-150 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-kinder text-zinc-400 font-mono">#{index + 1}</span>
                            <div>
                              <h4 className="text-xs font-extrabold text-zinc-800 leading-tight">{item.name}</h4>
                              <span className="text-[9px] text-zinc-500 font-mono">Rating: {item.rating} • Stock: {item.stockCount}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-extrabold text-[#ea580c] font-mono shrink-0">
                            {item.rankingScore} pts
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Relevance weights tuning sliders */}
                <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-base font-kinder text-zinc-900 uppercase flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-orange-600" />
                      {t("Poids du Tri Personnalisé")}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">{t("Ajustez la pondération de l'index de tri.")}</p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase mb-2">
                        <span>{t("Match Titre")}</span>
                        <span className="font-mono text-orange-600">x{weightTitle}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={weightTitle}
                        onChange={(e) => setWeightTitle(Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase mb-2">
                        <span>{t("Match Description")}</span>
                        <span className="font-mono text-orange-600">x{weightDesc}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={weightDesc}
                        onChange={(e) => setWeightDesc(Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase mb-2">
                        <span>{t("Évaluations Clients")}</span>
                        <span className="font-mono text-orange-600">x{weightRatings}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={weightRatings}
                        onChange={(e) => setWeightRatings(Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase mb-2">
                        <span>{t("Bonus Promotion")}</span>
                        <span className="font-mono text-orange-600">x{weightPromo}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={weightPromo}
                        onChange={(e) => setWeightPromo(Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase mb-2">
                        <span>{t("Disponibilité Stock")}</span>
                        <span className="font-mono text-orange-600">x{weightStock}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={weightStock}
                        onChange={(e) => setWeightStock(Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                      />
                    </div>
                  </div>
                </div>

                {/* Algérie Geographical Distribution stats */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 space-y-4">
                  <h4 className="text-xs font-kinder text-zinc-800 uppercase tracking-widest flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-600" />
                    {t("Répartition Géographique")}
                  </h4>
                  <div className="space-y-3">
                    {['Tizi Ouzou', 'Ghardaïa', 'Constantine', 'Alger', 'Tlemcen'].map(wil => {
                      const count = products.filter(p => p.wilaya === wil).length;
                      const percentage = products.length > 0 ? Math.round((count / products.length) * 100) : 0;
                      return (
                        <div key={wil} className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-zinc-600">
                            <span>{wil}</span>
                            <span>{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full h-1 bg-zinc-200 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-600 rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "synonyms" && (
            <SearchSynonyms algoliaCredentials={{ appId: algoliaAppId, apiKey: algoliaAdminKey, indexName: algoliaIndexName }} />
          )}

          {activeTab === "analytics" && (
            <SearchAnalytics />
          )}
        </div>
      )}
    </div>
  );
};
