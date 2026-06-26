import React from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VariantEditorProps {
  formData: any;
  setFormData: (val: any) => void;
  colorInput: string;
  setColorInput: (val: string) => void;
}

export const VariantEditor: React.FC<VariantEditorProps> = ({ formData, setFormData, colorInput, setColorInput }) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-6 bg-[#FFFBF5] p-6 rounded-2xl border border-[#E5DED4]">
        <h5 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            {t("Options de Couleurs")}
        </h5>
        <div className="flex flex-wrap gap-3">
            {formData.colors?.map((c: string) => (
                <span key={c} className="bg-white border border-[#E5DED4] text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm">
                <span className="w-3 h-3 rounded-full border border-black/10" style={{backgroundColor: c.toLowerCase()}}></span>
                {c}
                <button type="button" onClick={() => setFormData({...formData, colors: formData.colors.filter((x: string) => x !== c)})} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
            ))}
        </div>
        <div className="flex items-center gap-3">
            <input 
                type="text" 
                className="flex-1 px-4 py-2.5 bg-white border border-[#E5DED4] rounded-xl outline-none focus:border-[#C75C1A] text-sm font-medium" 
                placeholder={t("Ex: Rouge, Bleu, #FF0000...") || "Ex: Rouge, Bleu, #FF0000..."}
                value={colorInput}
                onChange={e => setColorInput(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const c = colorInput.trim();
                        if (c && !formData.colors?.includes(c)) {
                            setFormData({...formData, colors: [...(formData.colors||[]), c]});
                            setColorInput('');
                        }
                    }
                }}
            />
            <button 
                type="button" 
                onClick={() => {
                    const c = colorInput.trim();
                    if (c && !formData.colors?.includes(c)) {
                        setFormData({...formData, colors: [...(formData.colors||[]), c]});
                        setColorInput('');
                    }
                }}
                className="px-4 py-2.5 bg-[#C75C1A] text-white rounded-xl font-bold text-sm hover:bg-[#A64D16] transition-colors flex items-center gap-2"
            >
                <Plus className="w-4 h-4" /> {t("Ajouter")}
            </button>
        </div>
    </div>
  );
};
