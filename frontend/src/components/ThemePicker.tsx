import clsx from 'clsx';

import { Check } from 'lucide-react';

export type Theme = 'classic' | 'morandi-sage' | 'morandi-rose' | 'ocean-night' | 'nordic-cold';

interface ThemePickerProps {
    current: Theme;
    onSelect: (theme: Theme) => void;
}

const THEMES: { id: Theme; name: string; colors: string[]; desc: string }[] = [
    { id: 'classic', name: 'Classic Hive', colors: ['#F5A623', '#050505', '#111111'], desc: 'High Contrast' },
    { id: 'morandi-sage', name: 'Morandi Sage', colors: ['#A3B5A1', '#2C2E2B', '#3E413D'], desc: 'Muted & Soft' },
    { id: 'morandi-rose', name: 'Morandi Rose', colors: ['#D6A6A6', '#3D3535', '#524747'], desc: 'Muted & Soft' },
    { id: 'ocean-night', name: 'Ocean Night', colors: ['#00D1FF', '#0A1120', '#1A253A'], desc: 'Deep & Calm' },
    { id: 'nordic-cold', name: 'Nordic Cold', colors: ['#D1D5DB', '#1A1C1E', '#2D3035'], desc: 'Clean & Ice' },
];

export function ThemePicker({ current, onSelect }: ThemePickerProps) {
    return (
        <div className="flex flex-col gap-4 p-2">
            <div className="grid grid-cols-1 gap-3">
                {THEMES.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => onSelect(t.id)}
                        className={clsx(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                            current === t.id
                                ? "bg-white/10 border-white/20 shadow-lg"
                                : "bg-white/5 border-transparent hover:bg-white/10"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                                {t.colors.map((c, i) => (
                                    <div
                                        key={i}
                                        className="w-8 h-8 rounded-full border-2 border-[#111] shadow-sm"
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-sm font-bold text-white">{t.name}</span>
                                <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                    {t.desc}
                                </span>
                            </div>
                        </div>
                        {current === t.id && (
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white">
                                <Check size={14} />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <p className="text-[10px] text-zinc-600 leading-relaxed mt-4 px-2">
                * Morandi color palettes are designed to reduce visual fatigue during long deep work sessions.
            </p>
        </div>
    );
}
