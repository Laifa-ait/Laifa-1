import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { BadgeDollarSign } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export const RefundPolicy: React.FC = () => {
    const { t } = useTranslation();
    const [policyText, setPolicyText] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const docRef = doc(db, 'settings', 'global');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().refundPolicy) {
                    setPolicyText(docSnap.data().refundPolicy);
                } else {
                    setPolicyText("La politique de remboursement n'a pas encore été définie.");
                }
            } catch (error) {
                console.error("Error fetching policy:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPolicy();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[50vh] bg-stone-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-50 pt-24 pb-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-stone-100">
                    <div className="flex items-center gap-4 mb-8 pb-8 border-b border-stone-100">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                            <BadgeDollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-kinder text-stone-900 tracking-tight">{t("Politique de Remboursement")}</h1>
                            <p className="text-sm font-medium text-stone-500 mt-1">{t("Consultez les informations concernant les retours et remboursements.")}</p>
                        </div>
                    </div>

                    <div className="prose prose-stone max-w-none prose-p:text-sm prose-p:leading-relaxed prose-headings:font-kinder">
                        <ReactMarkdown>{policyText}</ReactMarkdown>
                    </div>
                </div>
            </div>
        </div>
    );
};
