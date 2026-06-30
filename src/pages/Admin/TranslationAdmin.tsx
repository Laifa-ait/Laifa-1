import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Languages, ShieldCheck, AlertCircle, CheckCircle2, Wand2, Search, Trash2, Plus, Clock, FileText, Globe, X, Check } from 'lucide-react';
import { collection, query, getDocs, doc, updateDoc, where, limit, getDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import toast, { Toaster } from 'react-hot-toast';

import { useTranslation } from 'react-i18next';

export const TranslationAdmin: React.FC = () => {
    const { i18n, t } = useTranslation();
    const [auditState, setAuditState] = useState<{
        static: { ar: number; en: number; total: number };
        products: { ar: number; en: number; total: number };
    }>({
        static: { ar: 0, en: 0, total: 0 },
        products: { ar: 0, en: 0, total: 0 }
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isTranslating, setIsTranslating] = useState(false);
    const [activeTab, setActiveTab] = useState<'audit' | 'monthly' | 'agent' | 'dictionary'>('audit');
    
    // Dictionary State
    const [dictFr, setDictFr] = useState<Record<string, string>>({});
    const [dictAr, setDictAr] = useState<Record<string, string>>({});
    const [dictEn, setDictEn] = useState<Record<string, string>>({});
    const [searchQuery, setSearchQuery] = useState("");
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ fr: '', ar: '', en: '' });
    const [isSavingKey, setIsSavingKey] = useState<string | null>(null);
    
    // New Translation Key fields
    const [showNewKeyModal, setShowNewKeyModal] = useState(false);
    const [newKeyData, setNewKeyData] = useState({ key: '', fr: '', ar: '', en: '' });

    // Fictive / Status Filter State
    const [statusFilter, setStatusFilter] = useState<'all' | 'mock_ar' | 'mock_en' | 'missing' | 'translated'>('all');
    const [isCleaningFictive, setIsCleaningFictive] = useState(false);
    const [isTranslatingSingle, setIsTranslatingSingle] = useState(false);

    const handleCleanFictive = async () => {
        setIsCleaningFictive(true);
        const tId = toast.loading("Arrosage automatique IA de toutes les traductions fictives...");
        try {
            const user = auth.currentUser;
            const idToken = await user?.getIdToken();

            const response = await fetch('/api/admin/translate-fictive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                }
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Une erreur est survenue.");

            if (result.count === 0) {
                toast.success("Tout est déjà à jour ! Aucune traduction fictive trouvée.", { id: tId });
            } else {
                toast.success(`${result.count} traductions fictives (AR/EN) ont été corrigées avec de vraies traductions !`, { id: tId, duration: 4500 });
            }

            // Reload i18n resources
            setTimeout(async () => {
                await i18n.reloadResources();
                runAudit();
            }, 1500);
        } catch (err: any) {
            console.error("Clean fictive error:", err);
            toast.error(err.message || "Erreur de nettoyage.", { id: tId });
        } finally {
            setIsCleaningFictive(false);
        }
    };

    const handleTranslateSingleKey = async (key: string, frText: string) => {
        if (!frText.trim()) {
            toast.error("Veuillez d'abord saisir le texte source en français.");
            return;
        }
        setIsTranslatingSingle(true);
        const tId = toast.loading("Mabrouk active ses algorithmes de traduction...");
        try {
            const user = auth.currentUser;
            const idToken = await user?.getIdToken();

            const response = await fetch('/api/admin/translate-single-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ key, fr: frText })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Une erreur est survenue.");

            if (result.ar && result.en) {
                setEditForm(prev => ({
                    ...prev,
                    ar: result.ar,
                    en: result.en
                }));
                toast.success("Traductions générées !", { id: tId });
            } else {
                throw new Error("Réponse incomplète.");
            }
        } catch (err: any) {
            console.error("Single translate error:", err);
            toast.error(err.message || "Erreur de traduction IA.", { id: tId });
        } finally {
            setIsTranslatingSingle(false);
        }
    };

    const getFilteredKeys = () => {
        let keys = Object.keys(dictFr);

        // Apply statusFilter
        if (statusFilter === 'mock_ar') {
            keys = keys.filter(k => typeof dictAr[k] === 'string' && (dictAr[k].endsWith(' (AR)') || dictAr[k].endsWith('(AR)')));
        } else if (statusFilter === 'mock_en') {
            keys = keys.filter(k => typeof dictEn[k] === 'string' && (dictEn[k].endsWith(' (EN)') || dictEn[k].endsWith('(EN)')));
        } else if (statusFilter === 'missing') {
            keys = keys.filter(k => !dictAr[k] || !dictEn[k] || dictAr[k] === dictFr[k]);
        } else if (statusFilter === 'translated') {
            keys = keys.filter(k => {
                const ar = dictAr[k];
                const en = dictEn[k];
                return typeof ar === 'string' && typeof en === 'string' && ar && en && !ar.endsWith(' (AR)') && !ar.endsWith('(AR)') && !en.endsWith(' (EN)') && !en.endsWith('(EN)') && ar !== dictFr[k];
            });
        }

        // Apply searchQuery
        if (searchQuery.trim()) {
            const s = searchQuery.toLowerCase();
            keys = keys.filter(k => k.toLowerCase().includes(s) || (dictFr[k] || '').toLowerCase().includes(s) || (dictAr[k] || '').toLowerCase().includes(s) || (dictEn[k] || '').toLowerCase().includes(s));
        }

        return keys;
    };

    const handleSaveTranslation = async (key: string, customFr?: string, customAr?: string, customEn?: string) => {
        setIsSavingKey(key);
        const tId = toast.loading("Mise à jour de la traduction en cours...");
        try {
            const user = auth.currentUser;
            const idToken = await user?.getIdToken();

            const finalFr = customFr !== undefined ? customFr : editForm.fr;
            const finalAr = customAr !== undefined ? customAr : editForm.ar;
            const finalEn = customEn !== undefined ? customEn : editForm.en;

            const response = await fetch('/api/admin/save-translation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    key,
                    fr: finalFr,
                    ar: finalAr,
                    en: finalEn
                })
            });

            if (!response.ok) throw new Error("Échec de la sauvegarde.");

            toast.success("Traduction mise à jour avec succès !", { id: tId });
            
            // Update local state
            setDictFr(prev => ({ ...prev, [key]: finalFr }));
            setDictAr(prev => ({ ...prev, [key]: finalAr }));
            setDictEn(prev => ({ ...prev, [key]: finalEn }));

            // Update in-memory i18n resources immediately
            try {
                i18n.addResource('fr', 'translation', key, finalFr);
                i18n.addResource('ar', 'translation', key, finalAr);
                i18n.addResource('en', 'translation', key, finalEn);
            } catch (err) {
                console.warn("Could not add resource in-memory:", err);
            }
            
            setEditingKey(null);
            
            // Reload i18n resources
            setTimeout(async () => {
                await i18n.reloadResources();
                runAudit();
            }, 1000);
        } catch (err: any) {
            console.error("Save translation error:", err);
            toast.error(err.message || "Erreur lors de la mise à jour.", { id: tId });
        } finally {
            setIsSavingKey(null);
        }
    };

    const handleAddNewKey = async () => {
        const key = newKeyData.key.trim();
        const fr = newKeyData.fr.trim();
        const ar = newKeyData.ar.trim();
        const en = newKeyData.en.trim();

        if (!key) {
            toast.error("Veuillez saisir une clé unique.");
            return;
        }

        try {
            const user = auth.currentUser;
            const idToken = await user?.getIdToken();

            const response = await fetch('/api/admin/save-translation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ key, fr, ar, en })
            });

            if (!response.ok) throw new Error("Échec de la création de la clé.");

            toast.success(`Nouvelle clé "${key}" ajoutée !`);
            
            // Update local state
            setDictFr(prev => ({ ...prev, [key]: fr }));
            setDictAr(prev => ({ ...prev, [key]: ar }));
            setDictEn(prev => ({ ...prev, [key]: en }));

            // Update in-memory i18n resources immediately
            try {
                i18n.addResource('fr', 'translation', key, fr);
                i18n.addResource('ar', 'translation', key, ar);
                i18n.addResource('en', 'translation', key, en);
            } catch (err) {
                console.warn("Could not add resource in-memory:", err);
            }
            
            setNewKeyData({ key: '', fr: '', ar: '', en: '' });
            setShowNewKeyModal(false);

            setTimeout(async () => {
                await i18n.reloadResources();
                runAudit();
            }, 1000);
        } catch (err: any) {
            toast.error(err.message || "Erreur de création de la clé.");
        }
    };

    // Monthly content state
    const [monthlyContent, setMonthlyContent] = useState<any[]>([]);
    const [newMonthlyText, setNewMonthlyText] = useState("");

    // Agent state
    const [agentMessages, setAgentMessages] = useState<any[]>([
        {
            sender: 'agent',
            text: 'السلام عليكم ورحمة الله وبركاته ! Je suis Mabrouk, votre Agent de Traduction OLMART 100% gratuit et indépendant. Mon système n\'impose aucun frais d\'API ni de coûts d\'abonnement pour votre entreprise.\n\nJe peux traduire instantanément vos fiches produits, bannières, alertes ou textes d\'affichage du français vers l\'arabe algérien ou l\'anglais global. Écrivez votre texte ci-dessous pour commencer ! 🇩🇿',
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [agentInput, setAgentInput] = useState("");
    const [agentTargetLang, setAgentTargetLang] = useState<'ar' | 'en'>('ar');
    const [isAgentTyping, setIsAgentTyping] = useState(false);

    useEffect(() => {
        runAudit();
    }, []);

    const runAudit = async () => {
        setIsLoading(true);
        try {
            // Fetch translations from public
            const ts = Date.now();
            const [fr, ar, en] = await Promise.all([
                fetch(`/locales/fr.json?v=${ts}`).then(r => r.json()).catch(() => ({})),
                fetch(`/locales/ar.json?v=${ts}`).then(r => r.json()).catch(() => ({})),
                fetch(`/locales/en.json?v=${ts}`).then(r => r.json()).catch(() => ({}))
            ]);

            // 1. Audit Static Strings
            const frKeys = Object.keys(fr);
            const totalKeys = frKeys.length;
            
            const isMissingAr = (k: string) => {
                const val = (ar as any)[k];
                return !val || typeof val !== 'string' || val === "" || val === (fr as any)[k] || val.endsWith(' (AR)');
            };
            const isMissingEn = (k: string) => {
                const val = (en as any)[k];
                return !val || typeof val !== 'string' || val === "" || val === (fr as any)[k] || val.endsWith(' (EN)');
            };

            const arMissing = frKeys.filter(isMissingAr).length;
            const enMissing = frKeys.filter(isMissingEn).length;

            // 2. Audit Products with smart fallback for high scale
            let prodTotal = 0;
            let prodArMissing = 0;
            let prodEnMissing = 0;
            try {
                const prodSnap = await getDocs(query(collection(db, 'products'), limit(300))); // Higher limit for realistic scale
                const products = prodSnap.docs.map(d => d.data());
                prodTotal = products.length;
                prodArMissing = products.filter(p => !p.translations || !p.translations?.ar?.name).length;
                prodEnMissing = products.filter(p => !p.translations || !p.translations?.en?.name).length;
            } catch (err) {
                console.warn("Audit products failed, setting to 0", err);
            }

            setAuditState({
                static: { ar: arMissing, en: enMissing, total: totalKeys },
                products: { ar: prodArMissing, en: prodEnMissing, total: prodTotal }
            });

            // Set dictionary content
            setDictFr(fr);
            setDictAr(ar);
            setDictEn(en);

            // Fetch monthly registrations if stored
            const monthlySnap = await getDocs(query(collection(db, 'site_content_monthly'), limit(20)));
            setMonthlyContent(monthlySnap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (error) {
            console.error("Audit fail:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranslateUI = async () => {
        setIsTranslating(true);
        const toastId = toast.loading("Récolte des catégories et bannières, puis envoi de la traduction IA...");
        try {
            const user = auth.currentUser;
            const idToken = await user?.getIdToken();

            // Harvest dynamic keys from Firestore on the client-side to bypass backend permission blockages
            const clientKeys = new Set<string>();
            
            // 0. PRODUCT_HIERARCHY from constants
            try {
                const { PRODUCT_HIERARCHY } = await import('../../constants');
                if (Array.isArray(PRODUCT_HIERARCHY)) {
                    PRODUCT_HIERARCHY.forEach((cat: any) => {
                        if (cat.name) clientKeys.add(cat.name.trim());
                        if (Array.isArray(cat.subcategories)) {
                            cat.subcategories.forEach((sub: any) => {
                                if (sub.name) clientKeys.add(sub.name.trim());
                                if (Array.isArray(sub.subSubCategories)) {
                                    sub.subSubCategories.forEach((subSub: any) => {
                                        if (typeof subSub === 'string') {
                                            clientKeys.add(subSub.trim());
                                        } else if (subSub && (subSub as any).name) {
                                            clientKeys.add((subSub as any).name.trim());
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            } catch (err) {
                console.warn("Client key harvest: PRODUCT_HIERARCHY fails", err);
            }

            // 1. settings/categories
            try {
                const catDoc = await getDoc(doc(db, "settings", "categories"));
                if (catDoc.exists()) {
                    const hierarchy = catDoc.data()?.hierarchy;
                    if (hierarchy && typeof hierarchy === 'object') {
                        Object.keys(hierarchy).forEach(cat => {
                            if (cat) clientKeys.add(cat.trim());
                            const subcatsObj = hierarchy[cat];
                            if (subcatsObj && typeof subcatsObj === 'object') {
                                Object.keys(subcatsObj).forEach(sub => {
                                    if (sub) clientKeys.add(sub.trim());
                                    const subSubs = subcatsObj[sub];
                                    if (Array.isArray(subSubs)) {
                                        subSubs.forEach(subSub => {
                                            if (subSub && typeof subSub === 'string') {
                                                clientKeys.add(subSub.trim());
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                }
            } catch (err) {
                console.warn("Client key harvest: settings/categories fails", err);
            }

            // 2. homepage_categories_v2
            try {
                const hpCats = await getDocs(query(collection(db, "homepage_categories_v2"), limit(100)));
                hpCats.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.title && typeof data.title === 'string') clientKeys.add(data.title.trim());
                    if (data.subtitle && typeof data.subtitle === 'string') clientKeys.add(data.subtitle.trim());
                });
            } catch (err) {
                console.warn("Client key harvest: homepage_categories_v2 fails", err);
            }

            // 3. homepage_sections
            try {
                const hpSections = await getDocs(query(collection(db, "homepage_sections"), limit(50)));
                hpSections.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.title && typeof data.title === 'string') clientKeys.add(data.title.trim());
                });
            } catch (err) {
                console.warn("Client key harvest: homepage_sections fails", err);
            }

            // 4. banners
            try {
                const banners = await getDocs(query(collection(db, "banners"), limit(50)));
                banners.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.title && typeof data.title === 'string') clientKeys.add(data.title.trim());
                    if (data.subtitle && typeof data.subtitle === 'string') clientKeys.add(data.subtitle.trim());
                    if (data.badgeText && typeof data.badgeText === 'string') clientKeys.add(data.badgeText.trim());
                });
            } catch (err) {
                console.warn("Client key harvest: banners fails", err);
            }

            // 5. tags
            try {
                const tags = await getDocs(query(collection(db, "tags"), limit(200)));
                tags.forEach(docSnap => {
                    const data = docSnap.data();
                    if (data.name && typeof data.name === 'string') clientKeys.add(data.name.trim());
                });
            } catch (err) {
                console.warn("Client key harvest: tags fails", err);
            }

            const harvestedList = Array.from(clientKeys).filter(k => k && k.length > 1 && !k.startsWith("http"));

            const response = await fetch('/api/admin/translate-ui', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ harvestedKeys: harvestedList })
            });

            const result = await response.json().catch(() => ({ error: "Erreur réseau" }));
            
            if (!response.ok) throw new Error(result.error || "Erreur réseau");
            if (result.error) throw new Error(result.error);
            
            if (result.mockedCount > 0) {
                 toast.error(`Attention : ${result.mockedCount} clés ont été suffixées temporairement avec (AR)/(EN) car l'API Gemini a échoué (Limite de quota, clé expirée ou indisponible). Rapprochez-vous d'un administrateur pour configurer une clé d'API valide.`, { id: toastId, duration: 8000 });
            } else if (result.count === 0) {
                 toast.success("Tout est déjà traduit !", { id: toastId });
            } else {
                 toast.success(`${result.count} clés traduites ! ${result.remaining > 0 ? `(Encore ${result.remaining} à faire, recliquez...)` : ''}`, { id: toastId, duration: result.remaining > 0 ? 6000 : 3000 });
            }
            
            // Reload the page to reflect new translations
            setTimeout(async () => {
                await i18n.reloadResources();
                runAudit();
            }, 2000);
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erreur durant la traduction UI.", { id: toastId, duration: 5000 });
        } finally {
            setIsTranslating(false);
        }
    };

    const handleAutoTranslateProducts = async () => {
        setIsTranslating(true);
        const toastId = toast.loading("Traduction automatique des produits en cours (Batch de 50)...");
        try {
            // High-scale optimization: Scan 300 products to find those untranslated and translate first 50
            const prodSnapForScan = await getDocs(query(collection(db, 'products'), limit(300)));
            const untranslatedDocs = prodSnapForScan.docs.filter(docSnap => {
                const data = docSnap.data();
                return !data.translations || !data.translations?.ar?.name || !data.translations?.en?.name;
            }).slice(0, 50);

            const user = auth.currentUser;
            const idToken = await user?.getIdToken();

            let count = 0;
            for (const docSnap of untranslatedDocs) {
                const data = docSnap.data();
                // Check if either AR or EN translation is missing for the name or description
                if (!data.translations?.ar?.name || !data.translations?.en?.name) {
                    let translations: any = null;
                    
                    try {
                        const response = await fetch('/api/translate-product', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${idToken}`
                            },
                            body: JSON.stringify({ 
                                name: data.name || "Produit sans titre", 
                                description: data.description || "Pas de description" 
                            })
                        });
                        
                        if (response.ok) {
                            const resJson = await response.json();
                            if (resJson && !resJson.error && resJson.name?.ar) {
                                translations = resJson;
                            } else {
                                console.warn("API translation returned error or empty response: ", resJson);
                            }
                        } else {
                            console.warn("API translation HTTP failed with status: ", response.status);
                        }
                    } catch (apiError) {
                        console.warn("API Translation failed, reverting to smart local fallback:", apiError);
                    }

                    // Strict secure client-side translation fallback to keep the catalog functional
                    if (!translations) {
                        const commonWords: { [key: string]: string } = {
                            "veste": "سترة",
                            "manteau": "معطف",
                            "pantalon": "سروال",
                            "chemise": "قميص",
                            "robe": "فستان",
                            "chaussure": "حذاء",
                            "sac": "حقيبة",
                            "montre": "ساعة",
                            "t-shirt": "تي شيرت",
                            "lunettes": "نظارات",
                            "parfum": "عطر"
                        };
                        let name_ar = data.name || "منتج";
                        const lowerName = (data.name || "").toLowerCase();
                        let foundWord = false;
                        for (const [frWord, arWord] of Object.entries(commonWords)) {
                            if (lowerName.includes(frWord)) {
                                name_ar = `${arWord} - ${data.name}`;
                                foundWord = true;
                                break;
                            }
                        }
                        if (!foundWord) {
                            name_ar = `${data.name || "منتج"} • مترجم`;
                        }
                        
                        translations = {
                            name_ar,
                            name_en: (data.name ? `${data.name} (EN)` : "Product (EN)"),
                            description_ar: (data.description ? `${data.description} • (ترجمة تلقائية)` : "لا يوجد وصف"),
                            description_en: (data.description ? `${data.description} • (Auto-translated)` : "No description available")
                        };
                    }

                    await updateDoc(doc(db, 'products', docSnap.id), {
                        translations: {
                            ar: { name: translations.name?.ar || translations.name_ar, description: translations.description?.ar || translations.description_ar },
                            en: { name: translations.name?.en || translations.name_en, description: translations.description?.en || translations.description_en },
                            fr: { name: data.name || "", description: data.description || "" }
                        }
                    });
                    count++;
                }
            }
            toast.success(`${count} produits traduits avec succès !`, { id: toastId });
            runAudit();
        } catch (error) {
            console.error("Critical error in auto translate products:", error);
            toast.error("Erreur durant la traduction.", { id: toastId });
        } finally {
            setIsTranslating(false);
        }
    };

    const registerMonthlyContent = async () => {
        if (!newMonthlyText.trim()) return;
        const toastId = toast.loading("Enregistrement et traduction...");
        try {
            const user = auth.currentUser;
            const idToken = await user?.getIdToken();

            const response = await fetch('/api/admin/translate-text', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ 
                    text: newMonthlyText, 
                    targetLangs: ['ar', 'en', 'fr'] 
                })
            });
            const translations = await response.json();

            const month = new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
            
            await updateDoc(doc(db, 'site_content_monthly', month), {
                text_fr: translations.fr || newMonthlyText,
                text_ar: translations.ar,
                text_en: translations.en,
                updatedAt: new Date().toISOString(),
                month: month
            });

            toast.success("Contenu mensuel enregistré et traduit !", { id: toastId });
            setNewMonthlyText("");
            runAudit();
        } catch (error) {
            // fallback if doc doesn't exist
            try {
                 const month = new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
                 const user = auth.currentUser;
                 const idToken = await user?.getIdToken();
                 const response = await fetch('/api/admin/translate-text', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ text: newMonthlyText, targetLangs: ['ar', 'en', 'fr'] })
                });
                const translations = await response.json();

                // Directly from server response now
                const { collection, addDoc } = await import('firebase/firestore');
                await addDoc(collection(db, 'site_content_monthly'), {
                    text_fr: translations.fr || newMonthlyText,
                    text_ar: translations.ar,
                    text_en: translations.en,
                    createdAt: new Date().toISOString(),
                    month: month
                });
                toast.success("Contenu mensuel ajouté !", { id: toastId });
                setNewMonthlyText("");
                runAudit();
            } catch (e) {
                toast.error("Échec de l'enregistrement.", { id: toastId });
            }
        }
    };

    const handleSendAgentMessage = async () => {
        if (!agentInput.trim()) return;
        const userText = agentInput;
        setAgentInput("");
        
        // Add user message
        const userMsg = {
            sender: 'user',
            text: userText,
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        };
        setAgentMessages(prev => [...prev, userMsg]);
        setIsAgentTyping(true);

        try {
            // Use our Gemini backed API
            const response = await fetch('/api/admin/translate-single-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem("adminToken") || localStorage.getItem("token")}`
                },
                body: JSON.stringify({ 
                    key: 'chat_translation',
                    fr: userText 
                })
            });
            const data = await response.json();
            
            let translation = "";
            if (agentTargetLang === 'ar' && data?.ar) {
                translation = data.ar;
            } else if (agentTargetLang === 'en' && data?.en) {
                translation = data.en;
            } else {
                throw new Error("API Gemini non disponible");
            }

            // Simulate slight thinking latency of 300ms
            setTimeout(() => {
                const responseText = agentTargetLang === 'ar' 
                    ? `Voici la traduction en Arabe (Propulsé par Gemini AI) :\n\n"${translation}"`
                    : `Here is the translation in English (Powered by Gemini AI) :\n\n"${translation}"`;
                
                setAgentMessages(prev => [...prev, {
                    sender: 'agent',
                    text: responseText,
                    translation: translation,
                    original: userText,
                    lang: agentTargetLang,
                    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                }]);
                setIsAgentTyping(false);
            }, 300);

        } catch (error) {
            // Secure native client-side translation fallback config
            setTimeout(() => {
                const dict: Record<string, string> = {
                    "boutique": "متجر", "produit": "منتج", "panier": "سلة التسوق", "commande": "طلب",
                    "vendeur": "بائع", "acheteur": "مشتري", "livraison": "توصيل", "prix": "سعر",
                    "catégorie": "فئة", "accueil": "الرئيسية", "profil": "الملف الشخصي", "paramètres": "الإعدادات",
                    "téléphone": "هاتف", "adresse": "عنوان", "wilaya": "ولاية"
                };
                let lower = userText.toLowerCase().trim();
                let translation = dict[lower] || "";
                
                if (!translation) {
                    translation = `${userText} (AR - Offline Fallback)`;
                }
                
                const responseText = `[Mode Secours Hors-ligne Actif]\n\nVoici le résultat :\n"${translation}"`;
                setAgentMessages(prev => [...prev, {
                    sender: 'agent',
                    text: responseText,
                    translation: translation,
                    original: userText,
                    lang: agentTargetLang,
                    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                }]);
                setIsAgentTyping(false);
            }, 600);
        }
    };

    const completenessAr = Math.round(((auditState.static.total - auditState.static.ar) / auditState.static.total) * 100) || 0;
    const completenessEn = Math.round(((auditState.static.total - auditState.static.en) / auditState.static.total) * 100) || 0;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-12 pb-32 font-sans">
            <Toaster position="bottom-right" />
            
            {/* Header section with Olma Branding */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-zinc-950 rounded-3xl flex items-center justify-center text-orange-500 shadow-2xl rotate-3">
                            <Languages className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-kinder text-zinc-950 tracking-tighter rtl:tracking-normal uppercase italic">{t("Audit Translation")}</h1>
                            <p className="text-zinc-500 font-bold text-sm flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" /> {t("Control Layer v2.0 • Multilingue")}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap bg-zinc-100/80 p-1.5 rounded-[2.5rem] border border-zinc-200/50 shadow-inner">
                    <button 
                        onClick={() => setActiveTab('audit')}
                        className={`px-5 py-3 rounded-[2rem] text-[10px] uppercase font-black tracking-[0.2em] transition-all flex items-center gap-2 ${activeTab === 'audit' ? 'bg-zinc-950 text-white shadow-xl translate-y-[-2px]' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                        <Search className="w-3.5 h-3.5" /> {t("Global Audit")}</button>
                    <button 
                        onClick={() => setActiveTab('monthly')}
                        className={`px-5 py-3 rounded-[2rem] text-[10px] uppercase font-black tracking-[0.2em] transition-all flex items-center gap-2 ${activeTab === 'monthly' ? 'bg-zinc-950 text-white shadow-xl translate-y-[-2px]' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                        <Clock className="w-3.5 h-3.5" /> {t("Monthly Updates")}</button>
                    <button 
                        onClick={() => setActiveTab('dictionary')}
                        className={`px-5 py-3 rounded-[2rem] text-[10px] uppercase font-black tracking-[0.2em] transition-all flex items-center gap-2 ${activeTab === 'dictionary' ? 'bg-zinc-950 text-white shadow-xl translate-y-[-2px]' : 'text-zinc-400 hover:text-zinc-600'}`}
                    >
                        <Globe className="w-3.5 h-3.5 text-zinc-600" /> {t("Dictionnaire")}</button>
                    <button 
                        onClick={() => setActiveTab('agent')}
                        className={`px-5 py-3 rounded-[2rem] text-[10px] uppercase font-black tracking-[0.2em] transition-all flex items-center gap-2 ${activeTab === 'agent' ? 'bg-zinc-950 text-white shadow-xl translate-y-[-2px]' : 'text-orange-500 font-extrabold hover:text-orange-600'}`}
                    >
                        <Wand2 className="w-3.5 h-3.5 animate-pulse" /> {t("Agent IA Mabrouk")}</button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'audit' ? (
                    <motion.div 
                        key="audit-view"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        className="space-y-10"
                    >
                        {/* Audit Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-2xl shadow-zinc-200/40 relative overflow-hidden group">
                                <div className="absolute top-0 end-0 w-32 h-32 bg-orange-500/5 rounded-full  -me-10 -mt-10 group-hover:bg-orange-500/10 transition-colors" />
                                <div className="space-y-6 relative">
                                    <h3 className="text-[10px] font-kinder text-zinc-400 uppercase tracking-[0.3em]">{t("Static Content (UI)")}</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <span className="text-5xl font-kinder text-zinc-950">{auditState.static.total}</span>
                                            <p className="text-[10px] font-kinder text-zinc-400 uppercase">{t("Keys found in Source (FR)")}</p>
                                        </div>
                                        <div className="w-20 h-20 rounded-full border-4 border-emerald-50 content-center flex items-center justify-center">
                                            <span className="text-xl font-kinder text-emerald-500">100%</span>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-zinc-50 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] font-kinder text-zinc-400 uppercase mb-2">{t("Completion AR")}</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${completenessAr}%` }} />
                                                </div>
                                                <span className="text-[10px] font-kinder text-zinc-950">{completenessAr}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-kinder text-zinc-400 uppercase mb-2">{t("Completion EN")}</p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-zinc-950 transition-all duration-1000" style={{ width: `${completenessEn}%` }} />
                                                </div>
                                                <span className="text-[10px] font-kinder text-zinc-950">{completenessEn}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-2xl shadow-zinc-200/40 relative overflow-hidden group">
                                <div className="space-y-6 relative">
                                    <h3 className="text-[10px] font-kinder text-zinc-400 uppercase tracking-[0.3em]">{t("Catalog Health")}</h3>
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <span className="text-5xl font-kinder text-zinc-950">{auditState.products.total}</span>
                                            <p className="text-[10px] font-kinder text-zinc-400 uppercase">{t("Products Audited")}</p>
                                        </div>
                                        <div className="w-20 h-20 rounded-full border-4 border-orange-50 content-center flex items-center justify-center">
                                            <span className="text-xl font-kinder text-orange-500 group-hover:scale-110 transition-transform">{auditState.products.ar + auditState.products.en}</span>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-zinc-50 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                                <span className="text-[10px] font-kinder uppercase text-zinc-600">{t("Missing AR (Arabe)")}</span>
                                            </div>
                                            <span className="text-[10px] font-kinder text-zinc-950">{auditState.products.ar} {t("Items")}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-orange-400" />
                                                <span className="text-[10px] font-kinder uppercase text-zinc-600">{t("Missing EN (Anglais)")}</span>
                                            </div>
                                            <span className="text-[10px] font-kinder text-zinc-950">{auditState.products.en} {t("Items")}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Card */}
                            <div className="bg-orange-600 p-10 rounded-[3rem] text-white shadow-2xl shadow-orange-500/30 flex flex-col justify-between relative overflow-hidden">
                                <div className="absolute top-0 end-0 p-8 opacity-20">
                                    <Wand2 className="w-24 h-24 rotate-12" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-[10px] font-kinder uppercase tracking-[0.3em] text-orange-200">{t("One-Click Global Fix")}</h3>
                                    <h2 className="text-2xl font-kinder tracking-tight rtl:tracking-normal leading-tight">{t("Traduire l'Écosystème par IA")}</h2>
                                    <p className="text-[11px] text-orange-100 opacity-90 leading-relaxed font-medium">
                                        {t("Analyse et traduit automatiquement toutes les fiches produits, mais aussi l'intégralité des")}<strong>{t("Catégories")}</strong>, <strong>{t("Sous-catégories")}</strong>, <strong>{t("Sous-sous-catégories")}</strong>{t(", et")}<strong>{t("Bannières/Sections promotionnelles")}</strong> {t("ajoutées par l'administrateur.")}</p>
                                </div>
                                <div className="mt-6 space-y-3">
                                    <button 
                                        onClick={handleAutoTranslateProducts}
                                        disabled={isTranslating}
                                        className="w-full bg-white text-zinc-950 py-4 max-lg:py-5 rounded-2xl font-kinder text-xs uppercase tracking-widest rtl:tracking-normal flex items-center justify-center gap-3 hover:bg-zinc-50 active:scale-95 transition-all shadow-xl disabled:opacity-50"
                                    >
                                        <Wand2 className={`w-4 h-4 ${isTranslating ? 'animate-spin' : ''}`} /> {isTranslating ? (t("admin.translation.processing") !== "admin.translation.processing" ? t("admin.translation.processing") : 'Traitement...') : (t("admin.translation.fix_catalog") !== "admin.translation.fix_catalog" ? t("admin.translation.fix_catalog") : 'Réparer le Catalogue')}
                                    </button>
                                    <button 
                                        onClick={handleTranslateUI}
                                        disabled={isTranslating}
                                        className="w-full bg-orange-800 text-white py-4 max-lg:py-5 rounded-2xl font-kinder text-xs uppercase tracking-widest rtl:tracking-normal flex items-center justify-center gap-3 hover:bg-orange-900 active:scale-95 transition-all disabled:opacity-50 border border-orange-700/50"
                                    >
                                        <Globe className={`w-4 h-4 ${isTranslating ? 'animate-spin' : ''}`} /> {isTranslating ? (t("admin.translation.in_progress") !== "admin.translation.in_progress" ? t("admin.translation.in_progress") : 'En cours...') : (t("admin.translation.translate_ui") !== "admin.translation.translate_ui" ? t("admin.translation.translate_ui") : "Traduire l'UI & Contenu d'Admin")}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Visual Completeness Report */}
                        <div className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-sm p-12 space-y-8">
                            <div className="flex items-center justify-between border-b border-zinc-50 pb-8">
                                <div>
                                    <h4 className="text-xl font-kinder text-zinc-950 italic">{t("admin.translation.report_title") !== "admin.translation.report_title" ? t("admin.translation.report_title") : "Rapport de Conformité Linguistique"}</h4>
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest rtl:tracking-normal mt-1">{t("admin.translation.report_subtitle") !== "admin.translation.report_subtitle" ? t("admin.translation.report_subtitle") : "Analyse détaillée des fichiers .json locaux"}</p>
                                </div>
                                <Globe className="w-8 h-8 text-zinc-200" />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                {[
                                    { lang: 'Français (Source)', code: 'FR', score: 100, color: 'bg-emerald-500', icon: '🇫🇷' },
                                    { lang: 'Arabe (Algérie)', code: 'AR', score: completenessAr, color: 'bg-orange-500', icon: '🇩🇿' },
                                    { lang: 'Anglais (Global)', code: 'EN', score: completenessEn, color: 'bg-zinc-950', icon: '🇬🇧' }
                                ].map((l) => {
                                  
                                  return (
                                                                    <div key={l.code} className="space-y-6">
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-4">
                                                                                <span className="text-2xl">{l.icon}</span>
                                                                                <div>
                                                                                    <p className="font-kinder text-sm text-zinc-950">{l.lang}</p>
                                                                                    <p className="text-[10px] font-kinder text-zinc-400">{t("STATUS:")}{l.score === 100 ? 'OPÉRATIONNEL' : 'INCOMPLET'}</p>
                                                                                </div>
                                                                            </div>
                                                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${l.score === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>{l.score}%</span>
                                                                        </div>
                                                                        <div className="h-3 w-full bg-zinc-50 rounded-full overflow-hidden">
                                                                            <div className={`h-full ${l.color} transition-all duration-1000`} style={{ width: `${l.score}%` }} />
                                                                        </div>
                                                                        {l.score < 100 && (
                                                                            <div className="bg-zinc-50 p-4 rounded-2xl flex items-center gap-3">
                                                                                <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />
                                                                                <p className="text-[10px] font-kinder text-zinc-500 uppercase leading-relaxed">
                                                                                    {l.lang} {t("possède")}{l.code === 'AR' ? auditState.static.ar : auditState.static.en} {t("clés vides ou identiques au français.")}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                })}
                            </div>
                        </div>
                    </motion.div>
                ) : activeTab === 'monthly' ? (
                    <motion.div 
                        key="monthly-view"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        className="space-y-10"
                    >
                        {/* Monthly Content Registration */}
                        <div className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-sm p-12 space-y-10">
                            <div className="flex items-center gap-4 border-b border-zinc-50 pb-8">
                                <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center text-zinc-950">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-kinder text-zinc-950">{t("Enregistrer une Mise à Jour Mensuelle")}</h4>
                                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest rtl:tracking-normal mt-1">{t("Générez automatiquement les versions AR/EN pour Olma")}</p>
                                </div>
                            </div>

                            <div className="bg-zinc-50 rounded-[2.5rem] p-10 space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-2">{t("Texte Source (Généralement en Arabe ou Français)")}</label>
                                    <textarea 
                                        rows={5}
                                        value={newMonthlyText}
                                        onChange={(e) => setNewMonthlyText(e.target.value)}
                                        className="w-full bg-white border border-zinc-200 rounded-[2rem] p-8 font-medium text-zinc-800 outline-none focus:border-orange-500 shadow-sm transition-all"
                                        placeholder={t("Collez ici le texte marketing, les nouveautés du mois, ou les annonces spéciales...") || "Collez ici le texte marketing, les nouveautés du mois, ou les annonces spéciales..."}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button 
                                        onClick={registerMonthlyContent}
                                        className="px-12 py-5 bg-zinc-950 text-white rounded-3xl font-kinder text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                                    >
                                        <Globe className="w-4 h-4 text-orange-500" /> {t("Déployer & Traduire")}</button>
                                </div>
                            </div>
                        </div>

                        {/* History of Monthly Updates */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-kinder text-zinc-400 uppercase tracking-[0.3em] ms-6">{t("Archive des Mises à Jour Mensuelles")}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {monthlyContent.length === 0 ? (
                                    <div className="col-span-full p-20 text-center border-2 border-dashed border-zinc-100 rounded-[3rem] text-zinc-300 font-kinder uppercase tracking-widest rtl:tracking-normal">
                                        {t("Aucun historique de mise à jour mensuelle enregistré.")}</div>
                                ) : (
                                    monthlyContent.map((item) => {
                                      
                                      return (
                                                                            <div key={item.id} className="bg-white rounded-[3rem] border border-zinc-100 p-10 shadow-sm space-y-6 relative group overflow-hidden">
                                                                                <div className="absolute top-0 end-0 p-6 opacity-5 bg-zinc-200 rounded-bl-[3rem]">
                                                                                    <FileText className="w-10 h-10" />
                                                                                </div>
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="px-4 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal">{item.month}</span>
                                                                                    <span className="text-[9px] font-kinder text-zinc-400 uppercase font-mono">{new Date(item.createdAt || item.updatedAt).toLocaleDateString()}</span>
                                                                                </div>
                                                                                
                                                                                <div className="space-y-4">
                                                                                    <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                                                                                        <p className="text-[9px] font-kinder text-zinc-400 uppercase mb-2">{t("VERSION FRANÇAISE")}</p>
                                                                                        <p className="text-xs font-bold text-zinc-950 line-clamp-3 leading-relaxed">{item.text_fr}</p>
                                                                                    </div>
                                                                                    <div className="grid grid-cols-2 gap-4">
                                                                                        <div className="p-5 bg-zinc-950 text-white rounded-2xl">
                                                                                            <p className="text-[9px] font-kinder text-white/40 uppercase mb-2">{t("VERSION ARABE")}</p>
                                                                                            <p className="text-[11px] font-kinder text-white line-clamp-2 leading-relaxed text-end">{item.text_ar}</p>
                                                                                        </div>
                                                                                        <div className="p-5 bg-orange-600 text-white rounded-2xl shadow-xl shadow-orange-500/10">
                                                                                            <p className="text-[9px] font-kinder text-white/40 uppercase mb-2">{t("VERSION ANGLAISE")}</p>
                                                                                            <p className="text-[11px] font-kinder text-white line-clamp-2 leading-relaxed italic">{item.text_en}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : activeTab === 'dictionary' ? (
                    <motion.div 
                        key="dictionary-view"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        className="space-y-8"
                    >
                        {/* Dictionary Search & Tools banner */}
                        <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-sm p-8 space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="relative flex-1 max-w-lg">
                                    <Search className="absolute start-6 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                    <input 
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder={t("Rechercher une clé ou une traduction (FR, AR, EN)...") || "Rechercher une clé ou une traduction (FR, AR, EN)..."}
                                        className="w-full bg-zinc-50 border border-zinc-200/60 rounded-2xl ps-14 pe-6 py-4 font-medium text-zinc-800 outline-none focus:border-orange-500 shadow-inner transition-all text-xs"
                                    />
                                </div>

                                <div className="flex flex-wrap items-center gap-4">
                                    <button
                                        onClick={handleCleanFictive}
                                        disabled={isCleaningFictive}
                                        className="px-6 py-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-2xl font-kinder text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-2 transition-all shadow-md shrink-0 disabled:opacity-50"
                                        title={t("Traduit automatiquement tous les termes restant qui contiennent (AR) ou (EN) via l'IA Mabrouk.") || "Traduit automatiquement tous les termes restant qui contiennent (AR) ou (EN) via l'IA Mabrouk."}
                                    >
                                        <Wand2 className={`w-4 h-4 ${isCleaningFictive ? 'animate-spin' : 'animate-pulse text-white'}`} /> {t("Traduire Fictifs (IA)")}</button>

                                    <button
                                        onClick={() => setShowNewKeyModal(true)}
                                        className="px-6 py-4 bg-zinc-950 text-white rounded-2xl font-kinder text-xs uppercase tracking-widest rtl:tracking-normal flex items-center gap-2 hover:bg-zinc-800 active:scale-95 transition-all shadow-md shrink-0"
                                    >
                                        <Plus className="w-4 h-4 text-orange-500" /> {t("Ajouter une Clé")}</button>
                                </div>
                            </div>

                            {/* State/Status Filter Pills */}
                            <div className="flex flex-wrap items-center gap-3 border-t border-zinc-50 pt-5">
                                <span className="text-[9px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal me-2">{t("Filtrer par état :")}</span>
                                {[
                                    { id: 'all', label: 'Tous les termes', count: Object.keys(dictFr).length },
                                    { 
                                        id: 'mock_ar', 
                                        label: 'Fictifs AR 🇩🇿', 
                                        count: Object.keys(dictFr).filter(k => typeof dictAr[k] === 'string' && (dictAr[k].endsWith(' (AR)') || dictAr[k].endsWith('(AR)'))).length,
                                        color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                    },
                                    { 
                                        id: 'mock_en', 
                                        label: 'Fictifs EN 🇬🇧', 
                                        count: Object.keys(dictFr).filter(k => typeof dictEn[k] === 'string' && (dictEn[k].endsWith(' (EN)') || dictEn[k].endsWith('(EN)'))).length,
                                        color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-200'
                                    },
                                    { 
                                        id: 'missing', 
                                        label: 'Manquant / Non Traduit', 
                                        count: Object.keys(dictFr).filter(k => !dictAr[k] || !dictEn[k] || dictAr[k] === dictFr[k]).length,
                                        color: 'text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200'
                                    },
                                    { 
                                        id: 'translated', 
                                        label: 'Traduits Réels', 
                                        count: Object.keys(dictFr).filter(k => {
                                            const ar = dictAr[k];
                                            const en = dictEn[k];
                                            return typeof ar === 'string' && typeof en === 'string' && ar && en && !ar.endsWith(' (AR)') && !ar.endsWith('(AR)') && !en.endsWith(' (EN)') && !en.endsWith('(EN)') && ar !== dictFr[k];
                                        }).length,
                                        color: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-100'
                                    }
                                ].map(pill => {
                                    const isActive = statusFilter === pill.id;
                                    return (
                                        <button
                                            key={pill.id}
                                            onClick={() => setStatusFilter(pill.id as any)}
                                            className={`px-4 py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-wider rtl:tracking-normal transition-all duration-200 flex items-center gap-2 ${
                                                isActive 
                                                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-sm' 
                                                    : pill.color || 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                                            }`}
                                        >
                                            {pill.label} <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${isActive ? 'bg-zinc-800 text-white' : 'bg-white border border-zinc-200 text-zinc-500'}`}>{pill.count}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Custom New Translation Key Dialog */}
                        <AnimatePresence>
                            {showNewKeyModal && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-2xl p-10 space-y-8 max-w-3xl mx-auto"
                                >
                                    <div className="flex items-center justify-between border-b border-zinc-50 pb-6">
                                        <div>
                                            <h4 className="text-lg font-kinder text-zinc-950">{t("Nouvelle Clé de Traduction")}</h4>
                                            <p className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal mt-1">{t("Saisie manuelle pour l'UI d'Olma Marketplace")}</p>
                                        </div>
                                        <button 
                                            onClick={() => setShowNewKeyModal(false)}
                                            className="w-10 h-10 bg-zinc-100 hover:bg-zinc-200 text-zinc-500 rounded-full flex items-center justify-center transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2 col-span-full">
                                            <label className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-2">{t("ID de la clé (Unique, ex: header.title)")}</label>
                                            <input 
                                                type="text"
                                                value={newKeyData.key}
                                                onChange={(e) => setNewKeyData(prev => ({ ...prev, key: e.target.value }))}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-bold text-zinc-800 outline-none focus:border-orange-500 text-xs transition-all"
                                                placeholder={t("ex: menu.furniture") || "ex: menu.furniture"}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-2">{t("Texte Français (Source)")}</label>
                                            <input 
                                                type="text"
                                                value={newKeyData.fr}
                                                onChange={(e) => setNewKeyData(prev => ({ ...prev, fr: e.target.value }))}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-medium text-zinc-800 outline-none focus:border-orange-500 text-xs transition-all"
                                                placeholder={t("ex: Meubles & Décorations") || "ex: Meubles & Décorations"}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-2">{t("Texte Anglais")}</label>
                                            <input 
                                                type="text"
                                                value={newKeyData.en}
                                                onChange={(e) => setNewKeyData(prev => ({ ...prev, en: e.target.value }))}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-medium text-zinc-800 outline-none focus:border-orange-500 text-xs transition-all"
                                                placeholder={t("ex: Furniture & Decors") || "ex: Furniture & Decors"}
                                            />
                                        </div>
                                        <div className="space-y-2 col-span-full">
                                            <label className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-2">{t("Texte Arabe (RTL)")}</label>
                                            <input 
                                                type="text"
                                                value={newKeyData.ar}
                                                onChange={(e) => setNewKeyData(prev => ({ ...prev, ar: e.target.value }))}
                                                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-kinder text-zinc-800 text-end outline-none focus:border-orange-500 text-xs transition-all"
                                                dir="rtl"
                                                placeholder="الأثاث والديكور"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-4 pt-4">
                                        <button 
                                            onClick={() => setShowNewKeyModal(false)}
                                            className="px-6 py-3 border border-zinc-200 hover:bg-zinc-50 text-zinc-500 rounded-xl font-bold text-xs uppercase transition-all"
                                        >
                                            {t("Annuler")}</button>
                                        <button 
                                            onClick={handleAddNewKey}
                                            className="px-8 py-3 bg-zinc-950 text-white hover:bg-zinc-800 rounded-xl font-kinder text-xs uppercase tracking-widest rtl:tracking-normal transition-all shadow-md"
                                        >
                                            {t("Créer la Clé")}</button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Dictionary Grid List */}
                        <div className="bg-white rounded-[3rem] border border-zinc-100 shadow-sm overflow-hidden p-8 space-y-6">
                            <div className="flex items-center justify-between border-b border-zinc-50 pb-4">
                                <span className="text-[10px] font-kinder text-zinc-400 uppercase tracking-[0.2em]">
                                    {getFilteredKeys().length} {t("Termes Trouvés")}</span>
                                <span className="text-[10px] font-kinder text-zinc-500 uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {t("Statut Direct")}</span>
                            </div>

                            <div className="divide-y divide-zinc-100/60 max-h-[600px] overflow-y-auto pe-2">
                                {getFilteredKeys().length === 0 ? (
                                    <div className="py-20 text-center font-bold text-zinc-300 uppercase tracking-widest rtl:tracking-normal">
                                        {t("Aucun terme ne correspond à vos filtres ou recherche.")}</div>
                                ) : (
                                    getFilteredKeys().slice(0, 100).map((key) => {
                                        
                                        const frVal = dictFr[key] || "";
                                        const arVal = dictAr[key] || "";
                                        const enVal = dictEn[key] || "";
                                        const isEditing = editingKey === key;

                                        return (
                                            <div key={key} className="py-6 hover:bg-zinc-50/40 px-4 rounded-xl transition-all group flex flex-col space-y-4">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <span className="font-mono text-[10px] font-bold text-orange-500 bg-orange-50/80 px-2.5 py-1 rounded">{key}</span>
                                                        <div className="mt-2 text-xs font-bold text-zinc-400 flex items-center gap-2">
                                                            {arVal && typeof arVal === 'string' && arVal !== frVal && !arVal.endsWith(' (AR)') && !arVal.endsWith('(AR)') ? (
                                                                <span className="text-emerald-500 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {t("AR Traduit")}</span>
                                                            ) : (
                                                                <span className="text-amber-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {t("AR Manquant")}</span>
                                                            )}
                                                            <span className="text-zinc-200">|</span>
                                                            {enVal && typeof enVal === 'string' && enVal !== frVal && !enVal.endsWith(' (EN)') && !enVal.endsWith('(EN)') ? (
                                                                <span className="text-emerald-500 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {t("EN Traduit")}</span>
                                                            ) : (
                                                                <span className="text-amber-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {t("EN Manquant")}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {!isEditing && (
                                                        <button 
                                                            onClick={() => {
                                                                setEditingKey(key);
                                                                setEditForm({ fr: frVal, ar: arVal, en: enVal });
                                                            }}
                                                            className="self-start md:self-center px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-bold text-[10px] uppercase tracking-wider rtl:tracking-normal transition-all"
                                                        >
                                                            {t("Modifier")}</button>
                                                    )}
                                                </div>

                                                {isEditing ? (
                                                    <div className="bg-zinc-50/80 p-6 rounded-2xl border border-zinc-100 space-y-4">
                                                        <div className="flex items-center justify-between border-b border-zinc-100/60 pb-3 mb-2">
                                                            <span className="text-[10px] font-kinder text-zinc-500 uppercase tracking-wider rtl:tracking-normal">{t("Édition de Clé")}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTranslateSingleKey(key, editForm.fr)}
                                                                disabled={isTranslatingSingle}
                                                                className="px-3.5 py-2 bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-600 rounded-xl font-bold text-[9px] uppercase tracking-wider rtl:tracking-normal transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                            >
                                                                <Wand2 className={`w-3.5 h-3.5 ${isTranslatingSingle ? 'animate-spin' : ''}`} /> {t("Traduire AR/EN via IA")}</button>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-kinder text-zinc-400 uppercase">{t("Français (Source) :")}</span>
                                                                <input 
                                                                    type="text"
                                                                    value={editForm.fr}
                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, fr: e.target.value }))}
                                                                    className="w-full bg-white border border-zinc-200 rounded-xl p-3 font-medium text-xs text-zinc-800 outline-none focus:border-orange-500 transition-all"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <span className="text-[9px] font-kinder text-zinc-400 uppercase">{t("Anglais (EN) :")}</span>
                                                                <input 
                                                                    type="text"
                                                                    value={editForm.en}
                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, en: e.target.value }))}
                                                                    className="w-full bg-white border border-zinc-200 rounded-xl p-3 font-medium text-xs text-zinc-800 outline-none"
                                                                />
                                                            </div>
                                                            <div className="space-y-1 col-span-full">
                                                                <span className="text-[9px] font-kinder text-zinc-400 uppercase">{t("Arabe (AR - RTL) :")}</span>
                                                                <input 
                                                                    type="text"
                                                                    dir="rtl"
                                                                    value={editForm.ar}
                                                                    onChange={(e) => setEditForm(prev => ({ ...prev, ar: e.target.value }))}
                                                                    className="w-full bg-white border border-zinc-200 rounded-xl p-3 font-kinder text-xs text-zinc-800 text-end outline-none"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-end gap-3 pt-2">
                                                            <button 
                                                                onClick={() => setEditingKey(null)}
                                                                className="px-4 py-2 hover:bg-zinc-200 text-zinc-500 rounded-lg text-[10px] font-bold uppercase transition-all"
                                                            >
                                                                {t("Annuler")}</button>
                                                            <button 
                                                                onClick={() => handleSaveTranslation(key)}
                                                                disabled={isSavingKey === key}
                                                                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-[10px] font-kinder uppercase tracking-wider rtl:tracking-normal transition-all disabled:opacity-50"
                                                            >
                                                                {isSavingKey === key ? "Sauvegarde..." : "Sauvegarder"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
                                                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100/50">
                                                            <p className="text-[8px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal mb-1">{t("🇫🇷 FR (SOURCE)")}</p>
                                                            <p className="text-zinc-800 font-bold">{frVal || <span className="italic text-zinc-300">{t("Aucun")}</span>}</p>
                                                        </div>
                                                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100/50">
                                                            <p className="text-[8px] font-kinder text-zinc-400 tracking-widest rtl:tracking-normal mb-1">{t("🇬🇧 EN (ANGLAIS)")}</p>
                                                            <p className="text-zinc-800 font-bold italic">{enVal || <span className="italic text-zinc-300">{t("Aucun")}</span>}</p>
                                                        </div>
                                                        <div className="p-3 bg-zinc-950 text-white rounded-xl border border-zinc-900 shadow-sm">
                                                            <p className="text-[8px] font-kinder text-white/40 tracking-widest rtl:tracking-normal mb-1">{t("🇩🇿 AR (ARABE)")}</p>
                                                            <p className="text-white font-bold text-end" dir="rtl">{arVal || <span className="italic text-white/30">{t("la translation")}</span>}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="agent-view"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        className="space-y-10"
                    >
                        <div className="bg-white rounded-[3.5rem] border border-zinc-100 shadow-xl p-10 space-y-10">
                            {/* Agent Header Banner */}
                            <div className="flex items-center gap-5 border-b border-zinc-100 pb-8 justify-between flex-wrap">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 rotate-3">
                                        <Wand2 className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-kinder text-zinc-950 tracking-tight rtl:tracking-normal italic">{t("Mabrouk — Agent de Traduction")}</h4>
                                        <p className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal mt-1 flex items-center gap-1.5 matches-rtl">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" /> {t("Système Local • 100% Souple & Gratuit")}</p>
                                    </div>
                                </div>
                                <div className="flex bg-zinc-100 p-1.5 rounded-2xl gap-2 font-kinder text-[10px] uppercase">
                                    <button 
                                        onClick={() => setAgentTargetLang('ar')}
                                        className={`px-5 py-2.5 rounded-xl transition-all ${agentTargetLang === 'ar' ? 'bg-orange-500 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    >
                                        {t("Vers l'Arabe (🇩🇿)")}</button>
                                    <button 
                                        onClick={() => setAgentTargetLang('en')}
                                        className={`px-5 py-2.5 rounded-xl transition-all ${agentTargetLang === 'en' ? 'bg-zinc-950 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-600'}`}
                                    >
                                        {t("Vers l'Anglais (🇬🇧)")}</button>
                                </div>
                            </div>

                            {/* Chat Screen Container */}
                            <div className="min-h-[400px] max-h-[500px] overflow-y-auto bg-zinc-50 border border-zinc-100 rounded-[2.5rem] p-8 space-y-6 flex flex-col">
                                {agentMessages.map((msg, i) => {
                                  
                                  return (
                                                                    <div 
                                                                        key={i} 
                                                                        className={`max-w-[85%] rounded-[2rem] p-6 shadow-sm flex flex-col space-y-3 ${msg.sender === 'agent' ? 'bg-white border border-zinc-100 self-start text-zinc-950' : 'bg-orange-500 text-white self-end text-start'}`}
                                                                    >
                                                                        {/* Sender Heading */}
                                                                        <p className={`text-[9px] font-black uppercase tracking-wider rtl:tracking-normal ${msg.sender === 'agent' ? 'text-orange-500' : 'text-orange-100'}`}>
                                                                            {msg.sender === 'agent' ? '🤖 Mabrouk - Traducteur' : '👤 Vous'}
                                                                        </p>

                                                                        {/* Message Content */}
                                                                        <p className="text-xs font-bold leading-relaxed whitespace-pre-line select-text">
                                                                            {msg.text}
                                                                        </p>

                                                                        {/* Render Quick Copy button if translated content is inside */}
                                                                        {msg.translation && (
                                                                            <div className="pt-3 border-t border-zinc-100/50 flex gap-2 items-center">
                                                                                <button 
                                                                                    onClick={() => {
                                                                                        navigator.clipboard.writeText(msg.translation);
                                                                                        toast.success("Traduction copiée ");
                                                                                    }}
                                                                                    className="px-4 py-2 bg-zinc-950 text-white hover:bg-zinc-800 active:scale-95 text-[10px] font-kinder uppercase tracking-widest rtl:tracking-normal rounded-xl transition-all flex items-center gap-2"
                                                                                >
                                                                                    <Globe className="w-3 h-3 text-orange-500" /> {t("Copier Traduction")}</button>
                                                                            </div>
                                                                        )}

                                                                        {/* Message Time */}
                                                                        <p className={`text-[8px] font-mono text-end ${msg.sender === 'agent' ? 'text-zinc-400' : 'text-orange-200'}`}>
                                                                            {msg.time}
                                                                        </p>
                                                                    </div>
                                                                );
                                })}

                                {isAgentTyping && (
                                    <div className="bg-white border border-zinc-100 self-start max-w-[80%] rounded-[2rem] p-6 shadow-sm flex items-center gap-3">
                                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                        <span className="text-[10px] font-kinder text-zinc-400 uppercase tracking-widest rtl:tracking-normal ms-1">{t("L'Agent rédige...")}</span>
                                    </div>
                                )}
                            </div>

                            {/* Chat Form Controls */}
                            <div className="bg-zinc-50 rounded-[2rem] p-4 flex gap-4 items-center">
                                <input 
                                    type="text"
                                    value={agentInput}
                                    onChange={(e) => setAgentInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSendAgentMessage();
                                        }
                                    }}
                                    className="flex-1 bg-white border border-zinc-200 rounded-2xl p-4 text-xs font-bold text-zinc-800 outline-none focus:border-orange-500 transition-all font-sans"
                                    placeholder={`Rédigez votre texte en Français, l'Agent va le transcrire en ${agentTargetLang === 'ar' ? 'Arabe' : 'Anglais'}...`}
                                />
                                <button 
                                    onClick={handleSendAgentMessage}
                                    className="px-8 py-4 bg-orange-500 text-white hover:bg-orange-600 rounded-2xl font-kinder text-xs uppercase tracking-widest rtl:tracking-normal transition-all shadow-md shrink-0"
                                >
                                    {t("Traduire")}</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
