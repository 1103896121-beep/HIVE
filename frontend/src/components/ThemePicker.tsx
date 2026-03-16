import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

export type Theme = 'classic' | 'morandi-rose' | 'ocean-night' | 'nordic-cold';

interface ThemePickerProps {
    current: Theme;
    onSelect: (theme: Theme) => void;
}

const THEMES: { id: Theme; nameKey: string; colors: string[]; descKey: string }[] = [
    { id: 'classic', nameKey: 'themes.classic', colors: ['#F5A623', '#050505', '#111111'], descKey: 'themes.high_contrast' },
    { id: 'morandi-rose', nameKey: 'themes.morandi_rose', colors: ['#D6A6A6', '#3D3535', '#524747'], descKey: 'themes.muted_soft' },
    { id: 'ocean-night', nameKey: 'themes.ocean_night', colors: ['#00D1FF', '#0A1120', '#1A253A'], descKey: 'themes.deep_calm' },
    { id: 'nordic-cold', nameKey: 'themes.nordic_cold', colors: ['#D1D5DB', '#1A1C1E', '#2D3035'], descKey: 'themes.clean_ice' },
];

export function ThemePicker({ current, onSelect }: ThemePickerProps) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col gap-4 p-2">
            <div className="grid grid-cols-1 gap-3">
                {THEMES.map((t_obj) => (
                    <button
                        key={t_obj.id}
                        onClick={() => onSelect(t_obj.id)}
                        className={clsx(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                            current === t_obj.id
                                ? "bg-white/10 border-white/20 shadow-lg"
                                : "bg-white/5 border-transparent hover:bg-white/10"
                        )}
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                                {t_obj.colors.map((c, i) => (
                                    <div
                                        key={i}
                                        className="w-8 h-8 rounded-full border-2 border-[#111] shadow-sm"
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-sm font-bold text-white">{t(t_obj.nameKey)}</span>
                                <span className="text-xs text-zinc-500 uppercase tracking-widest">
                                    {t(t_obj.descKey)}
                                </span>
                            </div>
                        </div>
                        {current === t_obj.id && (
                            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white">
                                <Check size={14} />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            <p className="text-[10px] text-zinc-600 leading-relaxed mt-4 px-2">
                {t('themes.morandi_desc')}
            </p>
        </div>
    );
}
