
import { useTranslation } from 'react-i18next';
import { Languages, Check } from 'lucide-react';
import { clsx } from 'clsx';

export function LanguageSwitcher() {
    const { t, i18n } = useTranslation();

    const LANGUAGES = [
        { code: 'en', label: t('profile.english') },
        { code: 'zh-CN', label: t('profile.simplified_chinese') }
    ];

    return (
        <div className="flex flex-col gap-4 p-2">
            <div className="flex items-center gap-2 px-2 opacity-80">
                <Languages size={18} style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-black uppercase tracking-widest text-white">{t('profile.language')}</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {LANGUAGES.map((lang) => (
                    <button
                        key={lang.code}
                        onClick={() => i18n.changeLanguage(lang.code)}
                        className={clsx(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98]",
                            i18n.language === lang.code
                                ? "bg-white/10 border-[var(--accent)]/30 shadow-lg"
                                : "bg-white/5 border-transparent hover:bg-white/10"
                        )}
                    >
                        <div className="flex flex-col items-start gap-1">
                            <span className={clsx(
                                "text-sm font-bold transition-colors",
                                i18n.language === lang.code ? "text-white" : "text-zinc-300"
                            )}>
                                {lang.label}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                {lang.code.toUpperCase()}
                            </span>
                        </div>
                        {i18n.language === lang.code && (
                            <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)]">
                                <Check size={14} strokeWidth={3} />
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
