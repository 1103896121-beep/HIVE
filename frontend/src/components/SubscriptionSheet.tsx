import { Zap, Check, CreditCard } from 'lucide-react';

interface SubscriptionSheetProps {
    onSubscribe: (plan: 'monthly' | 'yearly') => void;
    isLoading?: boolean;
}

export function SubscriptionSheet({ onSubscribe, isLoading }: SubscriptionSheetProps) {
    return (
        <div className="flex flex-col gap-6 p-2">
            <div className="text-center mb-4">
                <div className="w-16 h-16 bg-[#F5A623]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#F5A623]/30">
                    <Zap size={32} className="text-[#F5A623] fill-current" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Unlock Full Access</h3>
                <p className="text-sm text-zinc-400 mt-2">Your trial has ended. Choose a plan to continue your journey in the Hive.</p>
            </div>

            <div className="grid gap-4">
                {/* Monthly Plan */}
                <button
                    disabled={isLoading}
                    onClick={() => onSubscribe('monthly')}
                    className="group relative flex flex-col items-start p-5 rounded-3xl bg-white/5 border border-white/10 hover:border-[#F5A623]/50 transition-all hover:bg-white/[0.07] text-left"
                >
                    <div className="flex justify-between w-full items-center mb-1">
                        <span className="text-xs font-black uppercase tracking-widest text-[#F5A623]">Monthly Hive</span>
                        <span className="text-xl font-black text-white">$4.99<span className="text-xs text-zinc-500 font-bold">/mo</span></span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-4">Cancel anytime. Full Squad access.</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        <FeatureItem text="Infinite Focus" />
                        <FeatureItem text="All Squads" />
                        <FeatureItem text="Global Map" />
                    </div>
                </button>

                {/* Yearly Plan */}
                <button
                    disabled={isLoading}
                    onClick={() => onSubscribe('yearly')}
                    className="group relative flex flex-col items-start p-5 rounded-3xl bg-zinc-900 border-2 border-[#F5A623] hover:bg-zinc-800 transition-all text-left shadow-[0_0_20px_rgba(245,166,35,0.1)]"
                >
                    <div className="absolute -top-3 right-6 bg-[#F5A623] text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-lg">
                        Best Value - Save 40%
                    </div>
                    <div className="flex justify-between w-full items-center mb-1">
                        <span className="text-xs font-black uppercase tracking-widest text-[#F5A623]">Annual Hive</span>
                        <span className="text-xl font-black text-white">$29.99<span className="text-xs text-zinc-500 font-bold">/yr</span></span>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-4">One year of peak productivity.</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                        <FeatureItem text="Infinite Focus" />
                        <FeatureItem text="All Squads" />
                        <FeatureItem text="Premium Themes" />
                        <FeatureItem text="Supporter Badge" />
                    </div>
                </button>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-[#F5A623]/5 border border-[#F5A623]/10 flex items-start gap-3">
                <CreditCard size={16} className="text-[#F5A623] mt-0.5" />
                <p className="text-[10px] text-zinc-500 leading-relaxed font-bold uppercase tracking-tight">
                    Payments are handled securely via your App Store account. Your data remains perfectly synced across all devices.
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

function FeatureItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#F5A623]/20 flex items-center justify-center">
                <Check size={8} className="text-[#F5A623]" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{text}</span>
        </div>
    );
}
