import React from 'react';
import { MapPin, Navigation, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const LocationPicker: React.FC<{ onSelect: (location: string) => void }> = ({ onSelect }) => {
    const { t } = useTranslation();

    const options = [
        { id: '5km', name: '5km', desc: t('location.nearby', 'Nearby immediate area'), icon: <Navigation size={18} /> },
        { id: '50km', name: '50km', desc: t('location.city', 'City & metropolitan area'), icon: <MapPin size={18} /> },
        { id: '100km', name: '100km', desc: t('location.regional', 'Regional & surrounding cities'), icon: <MapPin size={18} /> },
        { id: 'Global', name: 'Global', desc: t('location.global', 'Anywhere in the world'), icon: <Globe size={18} /> },
    ];

    return (
        <div className="flex flex-col h-full overflow-y-auto space-y-3 pb-8 px-2 custom-scrollbar">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#F5A623]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#F5A623]/30">
                    <MapPin size={32} className="text-[#F5A623]" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    {t('location.select_range', 'Match Range')}
                </h3>
                <p className="text-xs text-zinc-400 mt-2 max-w-[200px] mx-auto leading-relaxed">
                    {t('location.range_desc', 'Select the geographic radius to discover other focuses.')}
                </p>
            </div>

            {options.map((opt) => (
                <button
                    key={opt.id}
                    onClick={() => onSelect(opt.id)}
                    className="w-full flex items-center gap-4 p-5 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all group"
                >
                    <div className="p-3 rounded-2xl bg-black/40 text-zinc-400 group-hover:text-[#F5A623] transition-colors">
                        {opt.icon}
                    </div>
                    <div className="flex flex-col items-start gap-1 text-left">
                        <span className="font-black text-white text-lg tracking-tight group-hover:text-[#F5A623] transition-colors">{opt.name}</span>
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold leading-snug">{opt.desc}</span>
                    </div>
                </button>
            ))}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
};
