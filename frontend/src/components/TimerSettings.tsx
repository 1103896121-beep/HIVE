import React from 'react';
import { Clock, Coffee, Zap } from 'lucide-react';
import { clsx } from 'clsx';

const OPTIONS = [
    { value: 15, label: 'Sprint', icon: Zap, desc: 'Short burst focus' },
    { value: 25, label: 'Classic', icon: Clock, desc: 'Standard Pomodoro' },
    { value: 45, label: 'Deep', icon: Coffee, desc: 'Deep work session' },
    { value: 60, label: 'Master', icon: Clock, desc: 'Maximum endurance' },
];

export const TimerSettings: React.FC<{ current: number, onSelect: (mins: number) => void }> = ({ current, onSelect }) => {
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
                                {opt.label}
                                <span className="text-xl font-black">{opt.value}m</span>
                            </div>
                            <div className={clsx("text-xs", current === opt.value * 60 ? "text-black/60" : "text-zinc-500")}>
                                {opt.desc}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-2">Notice</div>
                <div className="text-sm text-zinc-400 leading-relaxed">
                    Once started, switching Apps will break your focus streak and alert your hive members.
                </div>
            </div>
        </div>
    );
};
