import { useEffect, useState, useMemo } from 'react';
import { Zap, Star, Shield, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { subscriptionService } from '../api';
import { Capacitor } from '@capacitor/core';

interface CdvProduct {
    id: string;
    title: string;
    description: string;
    canPurchase: boolean;
    pricing?: { price: string };
}

interface CdvTransaction {
    verify: () => void;
}

interface CdvReceipt {
    nativeData: { receipt: string };
    finish: () => void;
}

interface CdvPurchaseStore {
    register: (products: { id: string; type: string; platform: string }[]) => void;
    when: () => {
        approved: (cb: (transaction: CdvTransaction) => void) => ReturnType<CdvPurchaseStore['when']>;
        verified: (cb: (receipt: CdvReceipt) => void) => ReturnType<CdvPurchaseStore['when']>;
        updated: (cb: () => void) => ReturnType<CdvPurchaseStore['when']>;
    };
    initialize: (platforms: string[]) => void;
    restore: () => void;
    products: CdvProduct[];
    get: (sku: string) => CdvProduct | undefined;
    order: (product: CdvProduct) => void;
}

declare global {
    interface Window {
        CdvPurchase?: {
            store: CdvPurchaseStore;
            ProductType: { PAID_SUBSCRIPTION: string; NON_CONSUMABLE: string };
            Platform: { APPLE_APPSTORE: string };
        };
    }
}

interface SubscriptionSheetProps {
    userId: string;
    onSuccess: (expiresAt: string) => void;
    onClose: () => void;
    onAlert: (title: string, message: string) => void;
}

export function SubscriptionSheet({ userId, onSuccess, onClose, onAlert }: SubscriptionSheetProps) {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<Array<{ productId: string, title: string, localizedPrice: string, description: string }>>([]);

    const productSkus = useMemo(() => [
        { productId: 'com.hive.monthly', title: t('subscription.monthly', 'Monthly'), localizedPrice: '$2.99', description: t('subscription.monthly_desc', 'Billed monthly') },
        { productId: 'com.hive.quarterly', title: t('subscription.quarterly', 'Quarterly'), localizedPrice: '$7.99', description: t('subscription.quarterly_desc', 'Save 11%') },
        { productId: 'com.hive.annual', title: t('subscription.annual', 'Annual'), localizedPrice: '$24.99', description: t('subscription.annual_desc', 'Save 30%') },
        { productId: 'com.hive.lifetime', title: t('subscription.lifetime', 'Lifetime'), localizedPrice: '$59.99', description: t('subscription.lifetime_desc', 'One time payment') }
    ], [t]);

    useEffect(() => {
        if (!Capacitor.isNativePlatform() || !window.CdvPurchase) {
            // Web Mock fallback
            const timer = setTimeout(() => {
                setProducts(productSkus);
            }, 800);
            return () => clearTimeout(timer);
        }

        const { store, ProductType, Platform } = window.CdvPurchase;
        
        store.register([
            { id: 'com.hive.monthly', type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
            { id: 'com.hive.quarterly', type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
            { id: 'com.hive.annual', type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
            { id: 'com.hive.lifetime', type: ProductType.NON_CONSUMABLE, platform: Platform.APPLE_APPSTORE }
        ]);

        store.when().approved((transaction: CdvTransaction) => transaction.verify());

        store.when().verified((receipt: CdvReceipt) => {
            // NATIVE: Send receipt to backend for true validation
            subscriptionService.verifyReceipt(userId, receipt.nativeData.receipt).then(resp => {
                if (resp.status === 'success') {
                    const expires = resp.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                    onSuccess(expires);
                    onAlert(t('common.success'), t('subscription.success_msg', { plan: 'Premium' }));
                    onClose();
                    receipt.finish();
                }
            }).catch(() => {
                onAlert(t('common.error'), 'Receipt verification failed.');
            }).finally(() => {
                setIsLoading(false);
            });
        });

        store.when().updated(() => {
            const nativeProducts = store.products.filter((p: CdvProduct) => p.canPurchase).map((p: CdvProduct) => ({
                productId: p.id,
                title: p.title,
                localizedPrice: p.pricing?.price || '',
                description: p.description
            })).filter((p: { localizedPrice: string }) => !!p.localizedPrice);
            
            if (nativeProducts.length > 0) {
               setProducts(nativeProducts);
            }
        });

        store.initialize([Platform.APPLE_APPSTORE]);

    }, [productSkus, t, onSuccess, onClose, onAlert]);

    const handlePurchase = async (sku: string) => {
        try {
            setIsLoading(true);
            
            if (Capacitor.isNativePlatform() && window.CdvPurchase) {
                const { store } = window.CdvPurchase;
                const product = store.get(sku);
                if (product) {
                    store.order(product);
                } else {
                    onAlert(t('common.error'), 'Product not found on store');
                    setIsLoading(false);
                }
            } else {
                // MOCK PURCHASE FLOW FOR WEB
                setTimeout(async () => {
                    const mapPlan = () => {
                       if(sku.includes('monthly')) return 'monthly';
                       if(sku.includes('quarterly')) return 'quarterly';
                       if(sku.includes('annual')) return 'yearly';
                       return 'lifetime';
                    };
                    try {
                        const resp = await subscriptionService.subscribe(userId, mapPlan());
                        if (resp.status === 'success') {
                            const future = new Date();
                            future.setDate(future.getDate() + 30);
                            onSuccess(future.toISOString());
                            onAlert(t('common.success'), t('subscription.success_msg', { plan: mapPlan() }));
                            onClose();
                        }
                    } catch {
                        onAlert(t('common.error'), 'Failed via mock backend.');
                    } finally {
                       setIsLoading(false);
                    }
                }, 1000);
            }
        } catch (error: unknown) {
            const err = error as { code?: string, message?: string };
            if (err.code !== 'E_USER_CANCELLED') {
                onAlert(t('common.error'), err.message || t('common.error'));
            }
            setIsLoading(false);
        }
    };

    const handleRestore = () => {
        if (!Capacitor.isNativePlatform() || !window.CdvPurchase) {
            onAlert(t('common.info', 'Info'), 'Restore is only available on iOS/Android.');
            return;
        }
        
        setIsLoading(true);
        const { store } = window.CdvPurchase;
        store.restore();
        
        // CdvPurchase.store.restore() handles the UI/Logic internally or through 'verified' events
        // we added a timeout to reset loading in case of no response
        setTimeout(() => {
            setIsLoading(false);
            onAlert(t('common.info'), t('subscription.restore_success'));
        }, 2000);
    };

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
                {products.length === 0 ? (
                    <div className="col-span-full py-10 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-zinc-500 mb-2" size={24} />
                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                            {t('subscription.loading_products', 'Loading Extracted Store Data...')}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Define visual mapping based on sku */}
                        {products.map((product: typeof productSkus[0]) => {
                            let periodStr = '';
                            let badgeStr = '';
                            let isHighlight = false;
                            let TitleIcon = null;

                            if (product.productId.includes('monthly')) {
                                periodStr = 'mo';
                            } else if (product.productId.includes('quarterly')) {
                                periodStr = 'qr';
                                badgeStr = t('subscription.badge_popular');
                                isHighlight = true;
                            } else if (product.productId.includes('annual')) {
                                periodStr = 'yr';
                            } else if (product.productId.includes('lifetime')) {
                                periodStr = 'once';
                                TitleIcon = <Star size={10} className="text-purple-400" />;
                            }

                            return (
                                <PlanButton 
                                    key={product.productId}
                                    title={product.title} 
                                    price={product.localizedPrice} 
                                    period={periodStr}
                                    desc={product.description}
                                    badge={badgeStr}
                                    onClick={() => handlePurchase(product.productId)}
                                    disabled={isLoading}
                                    highlight={isHighlight}
                                    icon={TitleIcon}
                                />
                            );
                        })}
                    </>
                )}
            </div>

            <div className="mt-4 flex flex-col items-center gap-4">
                <button
                    onClick={handleRestore}
                    disabled={isLoading}
                    className="text-[10px] text-zinc-500 font-black uppercase tracking-widest hover:text-[#F5A623] transition-colors"
                >
                    {t('subscription.restore_purchases')}
                </button>

                <div className="p-4 rounded-2xl bg-[#F5A623]/5 border border-[#F5A623]/10 flex items-start gap-3 w-full">
                    <Shield size={16} className="text-[#F5A623] mt-0.5" />
                    <p className="text-[10px] text-zinc-500 leading-relaxed font-bold uppercase tracking-tight">
                        {t('subscription.secure_note')}
                    </p>
                </div>

                <div className="flex items-center gap-4 mt-2">
                    <a href="/eula.html" className="text-[9px] text-zinc-600 uppercase font-black tracking-tighter hover:text-zinc-400">
                        {t('legal.eula')}
                    </a>
                    <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                    <a href="/privacy.html" className="text-[9px] text-zinc-600 uppercase font-black tracking-tighter hover:text-zinc-400">
                        {t('legal.privacy_policy')}
                    </a>
                </div>
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
                <div className="absolute -top-2 -right-2 bg-[#F5A623] text-black text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-lg z-10">
                    {badge}
                </div>
            )}
            <div className="flex flex-col w-full gap-1 mb-2">
                <div className="flex items-center gap-1.5">
                    {icon}
                    <span className={clsx("text-xs font-black uppercase tracking-widest", highlight ? "text-[#F5A623]" : "text-zinc-300")}>{title}</span>
                </div>
                <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-white">{price}</span>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">/{period}</span>
                </div>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight leading-relaxed mt-auto w-full">{desc}</p>
        </button>
    );
}

