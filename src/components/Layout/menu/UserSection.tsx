import React from 'react';
import { User } from 'lucide-react';
import { getRetroAvatar } from '../../../utils/avatar';
import { useTranslation } from "react-i18next";

interface UserSectionProps {
  currentUser: any;
  userProfile: any;
  handleNav: (path: string) => void;
}

export const UserSection: React.FC<UserSectionProps> = ({ currentUser, userProfile, handleNav }) => {
    const { t } = useTranslation();
  return (
    <div className="bg-zinc-950 rounded-3xl p-8 text-white relative overflow-hidden border border-white/5 shadow-xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl -mr-8 -mt-8" />
      {currentUser ? (
        <div className="relative z-10 flex items-center gap-4">
          <button onClick={() => handleNav("/dashboard/buyer")} className="w-16 h-16 rounded-2xl border-4 border-white/10 overflow-hidden shadow-lg cursor-pointer hover:border-white/30 transition-colors">
            <img loading="lazy" src={userProfile?.photoURL || currentUser.photoURL || getRetroAvatar(currentUser.email || currentUser.uid)} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
          </button>
          <div>
            <h4 className="font-black text-xl leading-tight text-white tracking-tighter rtl:tracking-normal shadow-sm">{userProfile?.displayName}</h4>
            <p className="text-white text-[10px] rtl:text-[12px] font-black uppercase tracking-widest rtl:tracking-normal mt-1.5 drop-shadow-sm">
              {userProfile?.role === 'admin' 
                ? 'Administrateur' 
                : userProfile?.role === 'seller' 
                  ? 'Vendeur Certifié ✨' 
                  : 'Client Privilège'}
            </p>
          </div>
        </div>
      ) : (
        <div className="relative z-10">
          <h4 className="font-black text-2xl mb-6 leading-tight text-white tracking-tighter rtl:tracking-normal">{t("Prêt à explorer Olma ?")}</h4>
          <button 
            onClick={() => handleNav("/auth")}
            className="w-full bg-[#ea580c] text-white py-4 rounded-2xl font-black text-xs rtl:text-sm uppercase tracking-widest rtl:tracking-normal flex items-center justify-center gap-3 shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
          >
            {t("Se connecter")}<User className="w-4 h-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
};
