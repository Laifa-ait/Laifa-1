import React, { useState, useMemo } from 'react';
import { Database, Search, Download, Settings, RefreshCw, FileCode, CheckCircle, Flame, MapPin, Sliders, Play, Info } from 'lucide-react';
import { MOCK_PRODUCTS } from '../../utils/mockProducts';
import { useTranslation } from "react-i18next";

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
  rankingScore: number; // calculated sorting priority score
}

export const SearchIndexAdmin: React.FC = () => {
    const { t } = useTranslation();
  const [selectedFormat, setSelectedFormat] = useState<'algolia' | 'typesense' | 'elasticsearch'>('algolia');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [selectedWilaya, setSelectedWilaya] = useState<string>('Tous');
  
  // Custom Ranking weights state
  const [weightTitle, setWeightTitle] = useState<number>(10);
  const [weightDesc, setWeightDesc] = useState<number>(4);
  const [weightRatings, setWeightRatings] = useState<number>(5);
  const [weightPromo, setWeightPromo] = useState<number>(3);
  const [weightStock, setWeightStock] = useState<number>(2);

  // Instant simulator search query
  const [simulatedSearch, setSimulatedSearch] = useState<string>('');
  const [exportedStatus, setExportedStatus] = useState<string>('');

  // Extract all categories & wilayas from mock products for filters
  const categories = useMemo(() => {
    const list = new Set<string>();
    MOCK_PRODUCTS.forEach(p => p.category && list.add(p.category));
    return ['Tous', ...Array.from(list)];
  }, []);

  const wilayas = useMemo(() => {
    const list = new Set<string>();
    MOCK_PRODUCTS.forEach(p => p.wilaya && list.add(p.wilaya));
    return ['Tous', ...Array.from(list)];
  }, []);

  // Compute the parsed exported list according to the model & ranking weights
  const modeledRecords: SearchIndexingModel[] = useMemo(() => {
    return MOCK_PRODUCTS.map(p => {
      // Calculate inventory stock status
      let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      if (p.stock <= 0) stockStatus = 'out_of_stock';
      else if (p.stock <= 4) stockStatus = 'low_stock';

      // Advanced ranking score calculation (Algolia/Typesense Custom Ranking configuration helper)
      const baseRatingBonus = p.rating ? p.rating * weightRatings * 1.5 : 0;
      const promoBonus = p.promoPrice ? weightPromo * 5 : 0;
      const stockBonus = p.stock > 0 ? weightStock * 3 : 0;
      const calculatedRankingScore = Math.round(100 + baseRatingBonus + promoBonus + stockBonus);

      return {
        objectID: p.id,
        name: p.name,
        name_arab: p.translations?.ar?.name || `${p.name} (ترجمة)`,
        name_english: p.translations?.en?.name || p.name,
        description: p.description,
        price: p.price,
        promoPrice: p.promoPrice,
        hasPromo: !!p.promoPrice,
        category: p.category,
        subcategory: p.subcategory,
        image: p.image,
        rating: p.rating || 0,
        stockStatus,
        stockCount: p.stock,
        wilaya: p.wilaya || 'Tous',
        sellerId: p.sellerId,
        sellerName: p.sellerName || 'Artisan Olma',
        tags: p.tags || [],
        createdAt_timestamp: p.createdAt ? new Date(p.createdAt).getTime() / 1000 : Math.floor(Date.now() / 1000),
        rankingScore: calculatedRankingScore
      };
    });
  }, [weightRatings, weightPromo, weightStock]);

  // Filters applying on export preview
  const filteredRecords = useMemo(() => {
    return modeledRecords.filter(rec => {
      const matchCat = selectedCategory === 'Tous' || rec.category === selectedCategory;
      const matchWilaya = selectedWilaya === 'Tous' || rec.wilaya === selectedWilaya;
      return matchCat && matchWilaya;
    });
  }, [modeledRecords, selectedCategory, selectedWilaya]);

  // Simulated live instant search matching logic
  const simulatedResults = useMemo(() => {
    if (!simulatedSearch.trim()) return filteredRecords.slice(0, 4);

    const queryLower = simulatedSearch.trim().toLowerCase();
    
    return filteredRecords
      .map(rec => {
        let score = 0;
        // Text Match scoring multiplied by custom search weights configuration
        if (rec.name.toLowerCase().includes(queryLower)) score += 100 * weightTitle;
        if (rec.description.toLowerCase().includes(queryLower)) score += 30 * weightDesc;
        if (rec.category.toLowerCase().includes(queryLower)) score += 50;
        
        // Add custom ranking score weight
        score += rec.rankingScore;

        return { rec, matchScore: score };
      })
      .filter(item => item.matchScore > item.rec.rankingScore) // only keep where relative score increased or matches well
      .sort((a, b) => b.matchScore - a.matchScore)
      .map(item => ({
        ...item.rec,
        rankingScore: item.matchScore // Override calculated rating score with match relevance score
      }));
  }, [filteredRecords, simulatedSearch, weightTitle, weightDesc]);

  // Generate complete configuration code snippets for Search Engine tools
  const configSchemaSnippet = useMemo(() => {
    if (selectedFormat === 'algolia') {
      return JSON.stringify({
        index_settings: {
          searchableAttributes: [
            `unordered(name)`,
            `unordered(name_english)`,
            `unordered(name_arab)`,
            `unordered(description)`,
            `tags`,
            `category`
          ],
          attributesForFaceting: [
            `searchable(category)`,
            `searchable(subcategory)`,
            `searchable(wilaya)`,
            `filterOnly(stockStatus)`,
            `filterOnly(hasPromo)`
          ],
          customRanking: [
            `desc(rankingScore)`,
            `desc(rating)`,
            `desc(createdAt_timestamp)`
          ],
          renderingContent: {
            facetOrdering: {
              facets: {
                order: ["category", "wilaya", "stockStatus"]
              }
            }
          }
        }
      }, null, 2);
    } else if (selectedFormat === 'typesense') {
      return JSON.stringify({
        name: "products",
        fields: [
          { name: "id", type: "string" },
          { name: "name", type: "string" },
          { name: "name_arab", type: "string", optional: true },
          { name: "name_english", type: "string", optional: true },
          { name: "description", type: "string" },
          { name: "price", type: "int32", facet: true },
          { name: "rating", type: "float", facet: true },
          { name: "category", type: "string", facet: true },
          { name: "wilaya", type: "string", facet: true },
          { name: "stockStatus", type: "string", facet: true },
          { name: "rankingScore", type: "int32" }
        ],
        default_sorting_field: "rankingScore"
      }, null, 2);
    } else {
      return JSON.stringify({
        mappings: {
          properties: {
            name: { type: "text", analyzer: "french" },
            name_arab: { type: "text", analyzer: "arabic" },
            name_english: { type: "text", analyzer: "english" },
            description: { type: "text", analyzer: "french" },
            price: { type: "double" },
            category: { type: "keyword" },
            wilaya: { type: "keyword" },
            rankingScore: { type: "integer" }
          }
        }
      }, null, 2);
    }
  }, [selectedFormat]);

  const handleDownloadExport = () => {
    try {
      let exportPayload = "";
      if (selectedFormat === 'algolia') {
        exportPayload = JSON.stringify({
          records: filteredRecords,
          settings: JSON.parse(configSchemaSnippet)
        }, null, 2);
      } else if (selectedFormat === 'typesense') {
        // Typesense expects JSON Lines format for imports
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
      
      setExportedStatus(`Enregistrement exporté (${filteredRecords.length} articles modélisés avec succès !)`);
      setTimeout(() => setExportedStatus(''), 5000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10 max-w-[1850px] mx-auto" id="search-index-admin-dashboard">
      
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-200 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-orange-600" />
            <span className="text-xs font-black text-orange-600 uppercase tracking-widest rtl:tracking-normal leading-none">{t("Modules Intel-Search")}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight rtl:tracking-normal text-zinc-900 uppercase">{t("Export & Modélisation de Recherche")}</h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-2xl">
            {t("Préparez, testez et exportez vos données de produits dans des schémas optimisés pour vos moteurs de recherche à haute vélocité (Algolia, Typesense).")}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadExport}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider rtl:tracking-normal hover:bg-zinc-800 transition-all cursor-pointer border-none shadow-md shadow-zinc-950/20"
          >
            <Download className="w-4 h-4 text-[#ea580c]" />
            {t("Exporter")}{filteredRecords.length} {t("articles")}</button>
        </div>
      </div>

      {exportedStatus && (
        <div className="bg-emerald-50 border border-emerald-200/60 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide leading-none">{exportedStatus}</p>
        </div>
      )}

      {/* Grid: Tuning weights & Search Engines configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): Config and Snippet preview */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Section: Select engine format & parameters */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm">
            <h2 className="text-lg font-black tracking-tight rtl:tracking-normal text-zinc-900 uppercase flex items-center gap-3 mb-6">
              <Settings className="w-5 h-5 text-zinc-400" />
              {t("1. Choix du Moteur & Filtres d'exportation")}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Target search provider choosing */}
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-2.5">{t("Moteur de recherche cible")}</label>
                <div className="flex bg-zinc-100 p-1.5 rounded-2xl gap-1">
                  {(['algolia', 'typesense', 'elasticsearch'] as const).map(format => (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format)}
                      className={`flex-1 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider rtl:tracking-normal rounded-xl transition-all border-none cursor-pointer ${
                        selectedFormat === format 
                          ? 'bg-white text-zinc-950 shadow-sm' 
                          : 'text-zinc-500 hover:text-zinc-950 bg-transparent'
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filtering scopes */}
              <div>
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-2.5">{t("Portée de l'indexation")}</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-zinc-100 border border-transparent rounded-2xl px-4 py-3 text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-300 transition-all font-sans"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={selectedWilaya}
                      onChange={(e) => setSelectedWilaya(e.target.value)}
                      className="w-full bg-zinc-100 border border-transparent rounded-2xl px-4 py-3 text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-300 transition-all font-sans"
                    >
                      {wilayas.map(wil => (
                        <option key={wil} value={wil}>{wil}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Configuration Schema and Mapping specifications preview */}
          <div className="bg-zinc-950 text-zinc-300 rounded-3xl p-6 md:p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-[#ea580c]" />
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider rtl:tracking-normal leading-none">{t("Schéma de configuration d'Index")}</h2>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest rtl:tracking-normal font-mono">{t("index-schema-")}{selectedFormat}{t(".json")}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#ea580c]/10 text-[#ea580c] border border-[#ea580c]/20 rounded-full text-[9px] font-black uppercase tracking-wider rtl:tracking-normal">
                <RefreshCw className="w-3 h-3 animate-spin" /> {t("Prêt")}</div>
            </div>

            <pre className="text-xs bg-zinc-900/60 p-6 rounded-2xl overflow-x-auto text-emerald-400 font-mono shadow-inner border border-zinc-800 leading-relaxed max-h-72">
              <code>{configSchemaSnippet}</code>
            </pre>
            <div className="mt-4 flex items-start gap-2.5 bg-zinc-900 p-4 rounded-xl border border-zinc-800/60 text-[11px] text-zinc-400 font-sans">
              <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">{t("Conseil de l'expert :")}</strong> {t("Chargez ce schéma de configuration dans votre console")}{selectedFormat} {t("afin d'initialiser d'avance les facettes et d'appliquer ces priorités de pertinence sur votre catalogue e-commerce.")}</div>
            </div>
          </div>

          {/* Model records visual rows list mapped */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black tracking-tight rtl:tracking-normal text-zinc-900 uppercase">{t("Documents Formatés (")}{filteredRecords.length})</h3>
                <p className="text-xs text-zinc-500">{t("Aperçu en temps réel de l'export des attributs")}</p>
              </div>
            </div>

            <div className="space-y-4 max-h-[450px] overflow-y-auto pe-2">
              {filteredRecords.map((doc) => {
                    
                    return (
                                  <div key={doc.objectID} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50 border border-zinc-150 hover:border-zinc-300 transition-all">
                                    <div className="flex items-center gap-4">
                                      <img loading="lazy" 
                                        src={doc.image} 
                                        alt={doc.name} 
                                        className="w-12 h-12 rounded-xl object-cover shrink-0" 
                                        referrerPolicy="no-referrer"
                                      />
                                      <div>
                                        <h4 className="text-xs font-black text-zinc-900 leading-tight">{doc.name}</h4>
                                        <p className="text-[10px] text-zinc-500 font-mono mt-1 uppercase tracking-wide">
                                          {t("ID:")}{doc.objectID} {t("• Cat:")}{doc.category}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                          <span className="text-[9px] font-semibold bg-zinc-200 text-zinc-800 px-2 py-0.5 rounded-full uppercase">
                                            {doc.wilaya}
                                          </span>
                                          {doc.hasPromo && (
                                            <span className="text-[9px] font-extrabold bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                                              <Flame className="w-2.5 h-2.5" /> {t("Promo")}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex sm:flex-col items-end gap-2 shrink-0 sm:text-end">
                                      <div>
                                        <span className="text-xs font-black text-zinc-900">
                                          {(doc.price / 100).toFixed(2)} {t("DZD")}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal leading-none">{t("Score Index :")}</span>
                                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 font-mono">
                                          {doc.rankingScore} {t("pts")}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                  })}
            </div>
          </div>

        </div>

        {/* Right Column (4 cols): Ranking config parameters & Simulator */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Sub-card: Interactive Search Matching Simulator */}
          <div className="bg-white border border-zinc-900 rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden">
            <div className="absolute top-0 end-0 w-32 h-32 bg-orange-650/5 rounded-full  pointer-events-none" />
            
            <h3 className="text-base font-black tracking-tight rtl:tracking-normal text-zinc-900 uppercase flex items-center gap-2 mb-2">
              <Play className="w-5 h-5 text-[#ea580c] fill-[#ea580c]" />
              {t("Simulateur de recherche")}</h3>
            <p className="text-xs text-zinc-500 mb-6">{t("Testez l'indexation instantanée sans requêtes Firestore (Dev-Safe Layer).")}</p>

            <div className="relative mb-6">
              <input
                type="text"
                placeholder={t("Exemple: Vase berbère, cuir, miel...") || "Exemple: Vase berbère, cuir, miel..."}
                value={simulatedSearch}
                onChange={(e) => setSimulatedSearch(e.target.value)}
                className="w-full bg-zinc-100 border border-transparent rounded-2xl ps-10 pe-4 py-3 text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-zinc-300 transition-all font-sans"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute start-4.5 top-3.5" />
            </div>

            <div className="space-y-4">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest rtl:tracking-normal block">{t("Classement de pertinence instantanée")}</span>
              
              {simulatedResults.length === 0 ? (
                <div className="text-center py-6 bg-zinc-50 rounded-2xl text-xs text-zinc-400 font-semibold uppercase">
                  {t("Aucun résultat trouvé dans la simulation")}</div>
              ) : (
                simulatedResults.map((item, index) => {
                  
                  return (
                                  <div key={item.objectID} className="p-3 bg-zinc-50 rounded-xl border border-zinc-150 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-black text-zinc-400 font-mono">#{index + 1}</span>
                                      <div>
                                        <h4 className="text-xs font-extrabold text-zinc-800 leading-tight">{item.name}</h4>
                                        <span className="text-[9px] text-zinc-500 font-mono">{t("Rating:")}{item.rating} {t("• Stock:")}{item.stockCount}</span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-extrabold text-[#ea580c] font-mono shrink-0">
                                      {item.rankingScore} {t("pts")}</span>
                                  </div>
                                );
                })
              )}
            </div>
          </div>

          {/* Sub-card: Configure ranking weight sliders */}
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-base font-black tracking-tight rtl:tracking-normal text-zinc-900 uppercase flex items-center gap-2 mb-1">
              <Sliders className="w-5 h-5 text-orange-600" />
              {t("Réglage de la Pertinence")}</h3>
            <p className="text-xs text-zinc-500 mb-6 font-sans">{t("Configurez la pondération des critères de tri personnalisables.")}</p>

            <div className="space-y-6">
              
              {/* Title criteria */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase mb-2">
                  <span>{t("Match du titre")}</span>
                  <span className="font-mono text-orange-600">{weightTitle}{t("search_admin.x", "x")}</span>
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

              {/* Description criteria */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase mb-2">
                  <span>{t("Match de la description")}</span>
                  <span className="font-mono text-orange-600">{weightDesc}{t("search_admin.x", "x")}</span>
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

              {/* Rating criteria */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase mb-2">
                  <span>{t("Évaluations étoiles")}</span>
                  <span className="font-mono text-orange-600">{weightRatings}{t("search_admin.x", "x")}</span>
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

              {/* Promo price criteria */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase mb-2">
                  <span>{t("Présence de promotion")}</span>
                  <span className="font-mono text-orange-600">{weightPromo}{t("search_admin.x", "x")}</span>
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

              {/* Stock criteria */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-700 uppercase mb-2">
                  <span>{t("Disponibilité du stock")}</span>
                  <span className="font-mono text-orange-600">{weightStock}{t("search_admin.x", "x")}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={weightStock}
                  onChange={(e) => setWeightStock(Number(e.target.value))}
                  className="w-full h-1.5 bg-zinc-150 rounded-lg appearance-none cursor-pointer accent-[#ea580c]"
                />
              </div>

            </div>
          </div>

          {/* Geographical distribution preview */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 shadow-sm">
            <h4 className="text-xs font-black text-zinc-800 uppercase tracking-widest rtl:tracking-normal flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-orange-600" />
              {t("Répartition par Wilaya")}</h4>
            <div className="space-y-3">
              {['Tizi Ouzou', 'Ghardaïa', 'Constantine', 'Alger', 'Tlemcen', 'Médéa'].map(wil => {
                const count = 0;
                const percentage = 0;
                return (
                  <div key={wil} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-zinc-600">
                      <span>{wil}</span>
                      <span>{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-650 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
