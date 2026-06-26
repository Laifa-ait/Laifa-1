import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Edit2, Check, X, RefreshCw, ArrowRight, HelpCircle } from "lucide-react";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export interface SynonymRule {
  id: string;
  word: string;
  synonyms: string[];
  type: "two-way" | "one-way";
}

interface SearchSynonymsProps {
  algoliaCredentials?: {
    appId: string;
    apiKey: string;
    indexName: string;
  };
}

export const SearchSynonyms: React.FC<SearchSynonymsProps> = ({ algoliaCredentials }) => {
  const { t } = useTranslation();
  const [synonyms, setSynonyms] = useState<SynonymRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [word, setWord] = useState("");
  const [synsInput, setSynsInput] = useState("");
  const [type, setType] = useState<"two-way" | "one-way">("two-way");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit fields
  const [editWord, setEditWord] = useState("");
  const [editSynsInput, setEditSynsInput] = useState("");
  const [editType, setEditType] = useState<"two-way" | "one-way">("two-way");

  useEffect(() => {
    const loadSynonyms = async () => {
      try {
        const docRef = doc(db, "settings", "search_synonyms");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().rules) {
          setSynonyms(docSnap.data().rules);
        } else {
          // Default baseline synonyms for Algerian Marketplace
          const defaultRules: SynonymRule[] = [
            { id: "1", word: "ordinateur", synonyms: ["pc", "laptop", "ordinateur portable"], type: "two-way" },
            { id: "2", word: "tapis", synonyms: ["zerbia", "mergoum", "tissage"], type: "two-way" },
            { id: "3", word: "robe", synonyms: ["melhfa", "kaftan", "caftan", "kabyle"], type: "two-way" },
            { id: "4", word: "miel", synonyms: ["asal", "pur", "cedre"], type: "one-way" },
          ];
          setSynonyms(defaultRules);
        }
      } catch (err) {
        console.error("Error loading synonyms:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSynonyms();
  }, []);

  const saveToFirestore = async (newRules: SynonymRule[]) => {
    setIsSaving(true);
    try {
      const docRef = doc(db, "settings", "search_synonyms");
      await setDoc(docRef, {
        rules: newRules,
        updatedAt: new Date().toISOString(),
      });
      setSynonyms(newRules);
      toast.success(t("Synonymes enregistrés dans Firestore ! ✨"));
    } catch (err) {
      console.error("Error saving synonyms:", err);
      toast.error(t("Erreur lors de la sauvegarde"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSynonym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !synsInput.trim()) {
      toast.error(t("Veuillez remplir tous les champs"));
      return;
    }

    const cleanSyns = synsInput
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    const newRule: SynonymRule = {
      id: crypto.randomUUID(),
      word: word.trim().toLowerCase(),
      synonyms: cleanSyns,
      type,
    };

    const updated = [...synonyms, newRule];
    await saveToFirestore(updated);

    setWord("");
    setSynsInput("");
    setType("two-way");
  };

  const handleDeleteSynonym = async (id: string) => {
    if (!window.confirm(t("Voulez-vous supprimer cette règle de synonyme ?"))) return;
    const updated = synonyms.filter((r) => r.id !== id);
    await saveToFirestore(updated);
  };

  const handleStartEdit = (rule: SynonymRule) => {
    setEditingId(rule.id);
    setEditWord(rule.word);
    setEditSynsInput(rule.synonyms.join(", "));
    setEditType(rule.type);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editWord.trim() || !editSynsInput.trim()) {
      toast.error(t("Les champs ne peuvent pas être vides"));
      return;
    }

    const cleanSyns = editSynsInput
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    const updated = synonyms.map((r) =>
      r.id === id
        ? {
            ...r,
            word: editWord.trim().toLowerCase(),
            synonyms: cleanSyns,
            type: editType,
          }
        : r
    );

    await saveToFirestore(updated);
    setEditingId(null);
  };

  const handleSyncAlgolia = async () => {
    if (!algoliaCredentials || !algoliaCredentials.appId || !algoliaCredentials.apiKey) {
      toast.error(t("Veuillez d'abord configurer et enregistrer des clés Algolia valides."));
      return;
    }

    toast.loading(t("Synchronisation des synonymes avec Algolia..."), { id: "sync-syns" });

    try {
      // Lazy load standard Algolia API Client to do index configuration
      // Since algoliasearch v4/v5 exports, let's write a standard raw fetch or client call
      // A raw fetch is super safe & guaranteed not to have import shape issues
      const { appId, apiKey, indexName } = algoliaCredentials;
      
      const algoliaRules = synonyms.map((rule) => {
        if (rule.type === "two-way") {
          return {
            objectID: `syn-${rule.id}`,
            type: "synonym",
            synonyms: [rule.word, ...rule.synonyms],
          };
        } else {
          return {
            objectID: `syn-${rule.id}`,
            type: "oneWaySynonym",
            input: rule.word,
            synonyms: rule.synonyms,
          };
        }
      });

      const response = await fetch(
        `https://${appId}.algolia.net/1/indexes/${indexName}/synonyms/batch?replaceExistingSynonyms=true`,
        {
          method: "POST",
          headers: {
            "X-Algolia-Application-Id": appId,
            "X-Algolia-API-Key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(algoliaRules),
        }
      );

      if (!response.ok) {
        throw new Error(`Algolia Error: ${response.statusText}`);
      }

      toast.success(t("Synonymes poussés sur Algolia avec succès ! 🚀"), { id: "sync-syns" });
    } catch (err: any) {
      console.error(err);
      toast.error(`${t("Échec de la synchronisation :")} ${err.message}`, { id: "sync-syns" });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm flex items-center justify-center min-h-[300px]">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* List of rules */}
      <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
          <div>
            <h3 className="text-lg font-kinder uppercase text-zinc-900">{t("Dictionnaire des Synonymes")}</h3>
            <p className="text-xs text-zinc-500 mt-1">
              {t("Définissez des équivalences de termes pour améliorer les taux de conversion d'achat.")}
            </p>
          </div>
          {algoliaCredentials?.appId && (
            <button
              onClick={handleSyncAlgolia}
              className="px-4 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md shadow-orange-500/20"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t("Pousser vers Algolia")}
            </button>
          )}
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {synonyms.length === 0 ? (
            <p className="text-sm text-zinc-400 italic text-center py-12">{t("Aucune règle de synonymes définie.")}</p>
          ) : (
            synonyms.map((rule) => (
              <div
                key={rule.id}
                className="p-4 rounded-2xl bg-zinc-50 border border-zinc-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-zinc-300"
              >
                {editingId === rule.id ? (
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">{t("Mot clé")}</label>
                        <input
                          type="text"
                          value={editWord}
                          onChange={(e) => setEditWord(e.target.value)}
                          className="w-full bg-white border border-zinc-200 outline-none px-3 py-1.5 rounded-xl text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">{t("Synonymes (séparés par virgules)")}</label>
                        <input
                          type="text"
                          value={editSynsInput}
                          onChange={(e) => setEditSynsInput(e.target.value)}
                          className="w-full bg-white border border-zinc-200 outline-none px-3 py-1.5 rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditType("two-way")}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            editType === "two-way" ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          {t("Bidirectionnel (<=>)")}
                        </button>
                        <button
                          onClick={() => setEditType("one-way")}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${
                            editType === "one-way" ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-600"
                          }`}
                        >
                          {t("Unidirectionnel (=>)")}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(rule.id)}
                          className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-xl transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 capitalize">{rule.word}</span>
                        {rule.type === "two-way" ? (
                          <span className="text-xs bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded-full font-semibold">
                            {t("Équivalence complète <=> ")}
                          </span>
                        ) : (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                            {t("Unidirectionnel")} <ArrowRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {rule.synonyms.map((syn, idx) => (
                          <span
                            key={idx}
                            className="bg-zinc-100 text-zinc-600 text-xs px-2.5 py-1 rounded-xl font-medium border border-zinc-200/50"
                          >
                            {syn}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(rule)}
                        className="p-2 hover:bg-zinc-100 text-blue-600 rounded-xl transition-all"
                        title={t("Modifier")}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSynonym(rule.id)}
                        className="p-2 hover:bg-zinc-100 text-red-600 rounded-xl transition-all"
                        title={t("Supprimer")}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Creation form */}
      <div className="lg:col-span-4 space-y-6">
        <form onSubmit={handleAddSynonym} className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <h3 className="text-base font-kinder uppercase text-zinc-900">{t("Ajouter une Règle")}</h3>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">{t("Terme racine")}</label>
            <input
              type="text"
              placeholder={t("Ex: pc") || "Ex: pc"}
              value={word}
              onChange={(e) => setWord(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 outline-none px-4 py-3 rounded-2xl text-xs font-semibold text-zinc-900 focus:bg-white focus:border-zinc-300 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
              {t("Synonymes (séparés par des virgules)")}
            </label>
            <input
              type="text"
              placeholder={t("Ex: laptop, ordinateur, portable") || "Ex: laptop, ordinateur, portable"}
              value={synsInput}
              onChange={(e) => setSynsInput(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 outline-none px-4 py-3 rounded-2xl text-xs font-semibold text-zinc-900 focus:bg-white focus:border-zinc-300 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">{t("Type d'association")}</label>
            <div className="grid grid-cols-2 gap-2 bg-zinc-50 p-1.5 rounded-2xl border border-zinc-200">
              <button
                type="button"
                onClick={() => setType("two-way")}
                className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer ${
                  type === "two-way" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950 bg-transparent"
                }`}
              >
                {t("Équivalent <=> ")}
              </button>
              <button
                type="button"
                onClick={() => setType("one-way")}
                className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all border-none cursor-pointer ${
                  type === "one-way" ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950 bg-transparent"
                }`}
              >
                {t("Unidirectionnel =>")}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-zinc-950 text-white font-kinder uppercase tracking-wider text-xs py-4 rounded-2xl flex items-center justify-center gap-2 transition-all hover:bg-zinc-800"
          >
            <Plus className="w-4 h-4" />
            {t("Créer la règle")}
          </button>
        </form>

        <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-zinc-700">
            <HelpCircle className="w-5 h-5 text-orange-500 shrink-0" />
            <span className="text-xs font-bold uppercase tracking-wide">{t("Comment ça marche ?")}</span>
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
            <strong>{t("Équivalent (Bidirectionnel) :")}</strong> {t("Une recherche sur 'pc' trouvera 'ordinateur' et vice-versa.")}
          </p>
          <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
            <strong>{t("Unidirectionnel :")}</strong> {t("Une recherche sur 'miel' trouvera 'pur' et 'cedre', mais chercher 'cedre' ne retournera pas forcément tous les miels.")}
          </p>
        </div>
      </div>
    </div>
  );
};
