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
    trialStatus: { isExpired: boolean; isPremium: boolean; daysLeft: number };
    onSuccess: (expiresAt: string) => void;
    onClose: () => void;
    onAlert: (title: string, message: string) => void;
}

export function SubscriptionSheet({ userId, trialStatus, onSuccess, onClose, onAlert }: SubscriptionSheetProps) {
    const { t, i18n } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<Array<{ productId: string, title: string, localizedPrice: string, description: string }>>([]);
    const [selectedSku, setSelectedSku] = useState<string | null>(null);

    const productSkus = useMemo(() => [
        { productId: 'com.hive.sub.monthly', title: t('subscription.monthly', 'Monthly'), localizedPrice: '$2.99', description: t('subscription.monthly_desc', 'Billed monthly') },
        { productId: 'com.hive.sub.quarterly', title: t('subscription.quarterly', 'Quarterly'), localizedPrice: '$7.99', description: t('subscription.quarterly_desc', 'Save 11%') },
        { productId: 'com.hive.sub.annual', title: t('subscription.annual', 'Annual'), localizedPrice: '$24.99', description: t('subscription.annual_desc', 'Save 30%') },
        { productId: 'com.hive.lifetime', title: t('subscription.lifetime', 'Lifetime'), localizedPrice: '$59.99', description: t('subscription.lifetime_desc', 'One time payment') }
    ], [t]);

    useEffect(() => {
        // 1. 立即停止界面转圈，使用本地多语言托底数据显示（乐观渲染）
        setProducts(productSkus);

        if (!Capacitor.isNativePlatform() || !window.CdvPurchase) {
            return;
        }

        const { store, ProductType, Platform } = window.CdvPurchase;
        
        // 防止重复注册
        if (store.products.length === 0) {
            store.register([
                { id: 'com.hive.sub.monthly', type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
                { id: 'com.hive.sub.quarterly', type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
                { id: 'com.hive.sub.annual', type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
                { id: 'com.hive.lifetime', type: ProductType.NON_CONSUMABLE, platform: Platform.APPLE_APPSTORE }
            ]);
        }

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
                onAlert(t('common.error'), t('subscription.verify_failed'));
            }).finally(() => {
                setIsLoading(false);
            });
        });

        // 收到苹果返回后，仅覆盖获取到本地化价格的真实项
        store.when().updated(() => {
            const nativeProducts = store.products.map((p: CdvProduct) => {
                const fallback = productSkus.find(f => f.productId === p.id);
                return {
                    productId: p.id,
                    title: p.title || fallback?.title || '',
                    localizedPrice: p.pricing?.price || fallback?.localizedPrice || '',
                    description: p.description || fallback?.description || '',
                    canPurchase: p.canPurchase
                };
            });
            
            // 如果成功向苹果拉取到了任何数据，刷新视图，否则保持原有托底不变
            if (nativeProducts.length > 0 && nativeProducts.some(p => !!p.localizedPrice)) {
               setProducts(nativeProducts);
            }
        });

        // 记录由底层抛出的任何关于凭证或通信的网络故障
        // @ts-ignore
        store.error((error: any) => {
            console.error('CdvPurchase Error:', error);
            setIsLoading(false);
        });

        store.initialize([Platform.APPLE_APPSTORE]);

    }, [productSkus, t, onSuccess, onClose, onAlert, userId]);

    useEffect(() => {
        if (products.length > 0 && !selectedSku) {
            const popular = products.find(p => p.productId.includes('quarterly'));
            setSelectedSku(popular ? popular.productId : products[0].productId);
        }
    }, [products, selectedSku]);

    const handlePurchase = async (sku: string) => {
        try {
            setIsLoading(true);
            
            if (Capacitor.isNativePlatform()) {
                if (window.CdvPurchase) {
                    const { store } = window.CdvPurchase;
                    const product = store.get(sku);
                    console.log('Attempting purchase for SKU:', sku, 'Product found:', !!product);
                    if (product) {
                        store.order(product);
                    } else {
                        // RE-REGISTER ATTEMPT IF NOT FOUND
                        console.warn('Product not found in store, attempting one-time register update');
                        const availableIds = store.products.map(p => p.id).join(', ');
                        onAlert(t('common.error'), t('subscription.product_not_found', { ids: availableIds || 'NONE' }));
                        setIsLoading(false);
                    }
                } else {
                    onAlert(t('common.error'), t('subscription.payment_plugin_error', 'In-App Purchases are not available right now.'));
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
                        onAlert(t('common.error'), t('subscription.mock_failed'));
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
            onAlert(t('common.info', 'Info'), t('subscription.native_only'));
            return;
        }
        
        setIsLoading(true);
        const { store } = window.CdvPurchase;
        store.restore();
        
        // CdvPurchase.store.restore() handles the verified events if successful
        // Longer timeout for Apple sandbox
        setTimeout(() => {
            setIsLoading(false);
            onAlert(t('common.info'), t('subscription.restore_check_complete'));
        }, 5000);
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
                    {trialStatus.isPremium 
                        ? t('profile.subscription_status') 
                        : (trialStatus.isExpired 
                            ? t('subscription.trial_finished') 
                            : t('profile.trial_days_left', { count: trialStatus.daysLeft }))}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {products.length === 0 ? (
                    <div className="col-span-full py-10 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-zinc-500 mb-2" size={24} />
                        <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                            {t('subscription.loading_products')}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Define visual mapping based on sku */}
                        {products.map((product: typeof productSkus[0]) => {
                            let periodStr = '';
                            let badgeStr = '';
                            let TitleIcon = null;

                            if (product.productId.includes('monthly')) {
                                periodStr = 'mo';
                            } else if (product.productId.includes('quarterly')) {
                                periodStr = 'qr';
                                badgeStr = t('subscription.badge_popular');
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
                                    onClick={() => setSelectedSku(product.productId)}
                                    disabled={isLoading}
                                    selected={selectedSku === product.productId}
                                    icon={TitleIcon}
                                />
                            );
                        })}
                    </>
                )}
            </div>

            <div className="mt-4 flex flex-col items-center gap-4">
                <button
                    onClick={() => { if(selectedSku) handlePurchase(selectedSku); }}
                    disabled={!selectedSku || isLoading}
                    className="w-full py-4 mt-2 rounded-2xl bg-[#F5A623] text-black font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d48f1f] transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(245,166,35,0.3)]"
                >
                    {isLoading ? t('common.loading', 'Loading...') : t('subscription.continue_payment', 'Confirm & Pay')}
                </button>
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
                    <button onClick={async () => {
                        const url = 'https://1103896121-beep.github.io/HIVE' + (i18n.language.includes('zh') ? '/eula.html' : '/eula_en.html');
                        if (Capacitor.isNativePlatform()) { await import('@capacitor/browser').then(m => m.Browser.open({ url })); } else { window.open(url, '_blank'); }
                    }} className="text-[9px] text-zinc-600 uppercase font-black tracking-tighter hover:text-zinc-400">
                        {t('legal.eula')}
                    </button>
                    <div className="w-1 h-1 bg-zinc-800 rounded-full" />
                    <button onClick={async () => {
                        const url = 'https://1103896121-beep.github.io/HIVE' + (i18n.language.includes('zh') ? '/privacy.html' : '/privacy_en.html');
                        if (Capacitor.isNativePlatform()) { await import('@capacitor/browser').then(m => m.Browser.open({ url })); } else { window.open(url, '_blank'); }
                    }} className="text-[9px] text-zinc-600 uppercase font-black tracking-tighter hover:text-zinc-400">
                        {t('legal.privacy_policy')}
                    </button>
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
    selected?: boolean;
    badge?: string;
    icon?: React.ReactNode;
}

function PlanButton({ title, price, period, desc, onClick, disabled, selected, badge, icon }: PlanButtonProps) {
    return (
        <button
            disabled={disabled}
            onClick={onClick}
            className={clsx(
                "group relative flex flex-col items-start p-4 rounded-2xl transition-all text-left",
                selected 
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
                    <span className={clsx("text-xs font-black uppercase tracking-widest", selected ? "text-[#F5A623]" : "text-zinc-300")}>{title}</span>
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

