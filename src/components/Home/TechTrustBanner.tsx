import React from 'react';
import { motion } from 'motion/react';
import { Truck, ShieldCheck, BadgeCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const TechTrustBanner: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="w-full py-4 border-y border-[#EBE5DF]/60 bg-white/40 backdrop-blur-md mb-8">
            <div className="max-w-[90rem] mx-auto px-4 flex items-center justify-between gap-4 overflow-x-auto scrollbar-hide">
                <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-2 shrink-0">
                    <Truck className="w-4 h-4 text-[#F37021]" />
                    <span className="font-mono text-[10px] rtl:text-[12px] uppercase text-[#121315] tracking-widest rtl:tracking-normal">[ {t("home.trust.delivery_58") || "LIVRAISON 58 WILAYAS"} ]</span>
                </motion.div>
                <div className="h-4 w-px bg-[#121315]/10 shrink-0" />
                <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-2 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-[#F37021]" />
                    <span className="font-mono text-[10px] rtl:text-[12px] uppercase text-[#121315] tracking-widest rtl:tracking-normal">[ {t("home.trust.cod") || "PAIEMENT CASH"} ]</span>
                </motion.div>
                <div className="h-4 w-px bg-[#121315]/10 shrink-0 hidden xs:block" />
                <motion.div whileHover={{ scale: 1.02 }} className="items-center gap-2 shrink-0 hidden xs:flex">
                    <BadgeCheck className="w-4 h-4 text-[#F37021]" />
                    <span className="font-mono text-[10px] rtl:text-[12px] uppercase text-[#121315] tracking-widest rtl:tracking-normal">[ {t("home.trust.certified") || "CRAFT PRIDE"} ]</span>
                </motion.div>
            </div>
        </div>
    );
};
