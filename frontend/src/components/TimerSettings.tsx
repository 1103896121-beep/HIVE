import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Coffee, Zap } from 'lucide-react';
import { clsx } from 'clsx';

const OPTIONS = [
    { value: 15, key: 'sprint', icon: Zap },
    { value: 25, key: 'classic', icon: Clock },
    { value: 45, key: 'deep', icon: Coffee },
    { value: 60, key: 'master', icon: Clock },
];

export const TimerSettings: React.FC<{ current: number, onSelect: (mins: number) => void }> = ({ current, onSelect }) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
                {OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => onSelect(opt.value)}
                        className={clsx(
                            "flex items-center gap-4 p-5 rounded-3xl transition-all border",
                            current === opt.value * 60
                                ? "bg-[#F5A623] border-[#F5A623] text-black shadow-lg shadow-[#F5A623]/20"
                                : "bg-white/5 border-white/5 text-white hover:bg-white/10"
                        )}
                    >
                        <div className={clsx("p-3 rounded-2xl", current === opt.value * 60 ? "bg-black/10" : "bg-black/40")}>
                            <opt.icon size={24} />
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-bold flex items-center justify-between">
                                {t(`timer.${opt.key}`)}
                                <span className="text-xl font-black">{opt.value}m</span>
                            </div>
                            <div className={clsx("text-xs", current === opt.value * 60 ? "text-black/60" : "text-zinc-500")}>
                                {t(`timer.${opt.key}_desc`)}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};
