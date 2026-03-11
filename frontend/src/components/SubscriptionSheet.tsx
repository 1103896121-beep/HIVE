import { Zap, Star, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface SubscriptionSheetProps {
    onSubscribe: (plan: 'monthly' | 'quarterly' | 'yearly' | 'lifetime') => void;
    isLoading?: boolean;
}

export function SubscriptionSheet({ onSubscribe, isLoading }: SubscriptionSheetProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-6 p-2">
            <div className="text-center mb-4">
                <div className="w-16 h-16 bg-[#F5A623]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#F5A623]/30">
                    <Zap size={32} className="text-[#F5A623] fill-current" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    {t('subscription.unlock_title')}
                </h3>
                <p className="text-sm text-zinc-400 mt-2">
                    {t('subscription.trial_finished')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Monthly */}
                <PlanButton 
                    title={t('subscription.monthly')} 
                    price="$1.99" 
                    period="mo"
                    desc={t('subscription.monthly_desc')}
                    onClick={() => onSubscribe('monthly')}
                    disabled={isLoading}
                />

                {/* Quarterly */}
                <PlanButton 
                    title={t('subscription.quarterly')} 
                    price="$4.99" 
                    period="qr"
                    desc={t('subscription.quarterly_desc')}
                    badge={t('subscription.badge_popular')}
                    onClick={() => onSubscribe('quarterly')}
                    disabled={isLoading}
                    highlight
                />

                {/* Yearly */}
                <PlanButton 
                    title={t('subscription.annual')} 
                    price="$14.99" 
                    period="yr"
                    desc={t('subscription.annual_desc')}
                    onClick={() => onSubscribe('yearly')}
                    disabled={isLoading}
                />

                {/* Lifetime */}
                <PlanButton 
                    title={t('subscription.lifetime')} 
                    price="$39.99" 
                    period="once"
                    desc={t('subscription.lifetime_desc')}
                    icon={<Star size={10} className="text-purple-400" />}
                    onClick={() => onSubscribe('lifetime')}
                    disabled={isLoading}
                />
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-[#F5A623]/5 border border-[#F5A623]/10 flex items-start gap-3">
                <Shield size={16} className="text-[#F5A623] mt-0.5" />
                <p className="text-[10px] text-zinc-500 leading-relaxed font-bold uppercase tracking-tight">
                    {t('subscription.secure_note')}
                </p>
            </div>

            {isLoading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-3xl z-50">
                    <div className="w-8 h-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
}

interface PlanButtonProps {
    title: string;
    price: string;
    period: string;
    desc: string;
    onClick: () => void;
    disabled?: boolean;
    highlight?: boolean;
    badge?: string;
    icon?: React.ReactNode;
}

function PlanButton({ title, price, period, desc, onClick, disabled, highlight, badge, icon }: PlanButtonProps) {
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={clsx(
                "group relative flex flex-col items-start p-4 rounded-2xl transition-all text-left",
                highlight 
                    ? "bg-zinc-900 border-2 border-[#F5A623] shadow-[0_0_15px_rgba(245,166,35,0.1)]" 
                    : "bg-white/5 border border-white/10 hover:border-white/20"
            )}
        >
            {badge && (
                <div className="absolute -top-2 -right-2 bg-[#F5A623] text-black text-[7px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                    {badge}
                </div>
            )}
            <div className="flex justify-between w-full items-center mb-0.5">
                <div className="flex items-center gap-1">
                    {icon}
                    <span className={clsx("text-[9px] font-black uppercase tracking-widest", highlight ? "text-[#F5A623]" : "text-zinc-400")}>{title}</span>
                </div>
                <span className="text-md font-black text-white">{price}<span className="text-[10px] text-zinc-500">/{period}</span></span>
            </div>
            <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-tight leading-none">{desc}</p>
        </button>
    );
}

