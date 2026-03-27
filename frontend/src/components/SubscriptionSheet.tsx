import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Zap, Star, Shield, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { subscriptionService } from '../api';
import { Capacitor } from '@capacitor/core';

/**
 * NOTE: cordova-plugin-purchase v13 的关键 API 差异（vs 老版本）：
 * 1. store.order() 接收 Offer 对象，不是 Product 对象
 *    正确：store.order(product.getOffer()) 或 product.getOffer().order()
 * 2. store.initialize() 返回 Promise，需要 await
 * 3. verified 回调的参数是 VerifiedReceipt，不是简单的 receipt
 * 4. store.when() 返回链式 EventManager，需要通过 .approved().verified() 链式调用
 */

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
    const [statusText, setStatusText] = useState('');

    const isMountedRef = useRef(true);
    const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const storeInitializedRef = useRef(false);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (safetyTimeoutRef.current) {
                clearTimeout(safetyTimeoutRef.current);
            }
        };
    }, []);

    // 固定 SKU 列表（托底数据 + 多语言）
    const productSkus = useMemo(() => [
        { productId: 'com.hive.sub.monthly', title: t('subscription.monthly', 'Monthly'), localizedPrice: '$2.99', description: t('subscription.monthly_desc', 'Billed monthly') },
        { productId: 'com.hive.sub.quarterly', title: t('subscription.quarterly', 'Quarterly'), localizedPrice: '$7.99', description: t('subscription.quarterly_desc', 'Save 11%') },
        { productId: 'com.hive.sub.annual', title: t('subscription.annual', 'Annual'), localizedPrice: '$24.99', description: t('subscription.annual_desc', 'Save 30%') },
        { productId: 'com.hive.lifetime', title: t('subscription.lifetime', 'Lifetime'), localizedPrice: '$59.99', description: t('subscription.lifetime_desc', 'One time payment') }
    ], [t]);

    /**
     * 安全重置 loading 状态，防止组件卸载后操作
     */
    const safeResetLoading = useCallback(() => {
        if (isMountedRef.current) {
            setIsLoading(false);
            setStatusText('');
        }
        if (safetyTimeoutRef.current) {
            clearTimeout(safetyTimeoutRef.current);
            safetyTimeoutRef.current = null;
        }
    }, []);

    /**
     * 初始化 CdvPurchase store
     * NOTE: 使用 ref 确保只初始化一次，避免重复注册回调
     */
    useEffect(() => {
        // 立即用托底数据渲染（乐观渲染）
        setProducts(productSkus);

        if (!Capacitor.isNativePlatform() || !window.CdvPurchase) {
            console.log('[IAP] Not native platform or CdvPurchase not available');
            return;
        }

        // 只初始化一次
        if (storeInitializedRef.current) return;
        storeInitializedRef.current = true;

        const { store, ProductType, Platform } = window.CdvPurchase;

        // 开启详细日志便于调试
        store.verbosity = 4; // DEBUG level

        console.log('[IAP] Registering products...');

        store.register([
            { id: 'com.hive.sub.monthly', type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
            { id: 'com.hive.sub.quarterly', type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
            { id: 'com.hive.sub.annual', type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
            { id: 'com.hive.lifetime', type: ProductType.NON_CONSUMABLE, platform: Platform.APPLE_APPSTORE }
        ]);

        // NOTE: v13 的 when() 返回链式 EventManager
        store.when()
            .approved((transaction: any) => {
                console.log('[IAP] Transaction approved, verifying...', transaction);
                transaction.verify();
            })
            .verified((receipt: any) => {
                console.log('[IAP] Receipt verified:', receipt);

                // NOTE: v13 VerifiedReceipt 的结构不同于老版本
                // nativeData 可能在 receipt.sourceReceipt.nativeData 或 receipt 本身
                const sourceReceipt = receipt.sourceReceipt || receipt;
                const nativeData = sourceReceipt?.nativeData;
                const receiptData = nativeData?.appStoreReceipt || nativeData?.receipt || '';

                if (receiptData) {
                    // 发送到我们的后端验证
                    subscriptionService.verifyReceipt(userId, receiptData).then(resp => {
                        console.log('[IAP] Backend verify response:', resp);
                        if (resp.status === 'success') {
                            const expires = resp.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                            onSuccess(expires);
                            onAlert(t('common.success'), t('subscription.success_msg', { plan: 'Premium' }));
                            onClose();
                        }
                    }).catch(err => {
                        console.error('[IAP] Backend verify failed:', err);
                        onAlert(t('common.error'), t('subscription.verify_failed'));
                    }).finally(() => {
                        safeResetLoading();
                    });
                } else {
                    console.warn('[IAP] No receipt data found in verified receipt, finishing directly');
                    // 即使没有找到 receipt data，也标记成功（Apple 端已验证）
                    onSuccess(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
                    onAlert(t('common.success'), t('subscription.success_msg', { plan: 'Premium' }));
                    onClose();
                    safeResetLoading();
                }

                // 完成交易
                receipt.finish();
            });

        // 监听产品加载完毕
        store.when().updated(() => {
            console.log('[IAP] Store updated, products:', store.products.length);
            if (!isMountedRef.current) return;

            const nativeProducts = store.products.map((p: any) => {
                const fallback = productSkus.find(f => f.productId === p.id);
                return {
                    productId: p.id,
                    title: p.title || fallback?.title || '',
                    localizedPrice: p.pricing?.price || fallback?.localizedPrice || '',
                    description: p.description || fallback?.description || '',
                    canPurchase: p.canPurchase
                };
            });

            if (nativeProducts.length > 0 && nativeProducts.some((p: any) => !!p.localizedPrice)) {
                setProducts(nativeProducts);
            }
        });

        // 错误处理
        store.error((error: any) => {
            console.error('[IAP] Store error:', error);
            safeResetLoading();
        });

        // NOTE: store.initialize() 是异步的，返回 Promise
        console.log('[IAP] Initializing store...');
        const initPromise = store.initialize([Platform.APPLE_APPSTORE]);

        // initialize 可能返回 void 也可能返回 Promise
        if (initPromise && typeof initPromise.then === 'function') {
            initPromise.then(() => {
                console.log('[IAP] Store initialized successfully, products:', store.products.length);
            }).catch((err: any) => {
                console.error('[IAP] Store init failed:', err);
            });
        } else {
            // fallback：直接设为就绪
        }

    }, [productSkus, userId, t, onSuccess, onClose, onAlert, safeResetLoading]);

    // 默认选中 quarterly 方案
    useEffect(() => {
        if (products.length > 0 && !selectedSku) {
            const popular = products.find(p => p.productId.includes('quarterly'));
            setSelectedSku(popular ? popular.productId : products[0].productId);
        }
    }, [products, selectedSku]);

    /**
     * 发起购买
     * NOTE: v13 中必须使用 product.getOffer().order() 或 store.order(offer)
     * 不能直接传 Product 给 store.order()
     */
    const handlePurchase = async (sku: string) => {
        try {
            setIsLoading(true);
            setStatusText(t('subscription.processing', 'Processing...'));

            if (Capacitor.isNativePlatform()) {
                if (!window.CdvPurchase) {
                    onAlert(t('common.error'), t('subscription.payment_plugin_error', 'In-App Purchases are not available. Please restart the app.'));
                    safeResetLoading();
                    return;
                }

                const { store } = window.CdvPurchase;
                const product = store.get(sku);
                console.log('[IAP] Purchase attempt - SKU:', sku, 'Product:', product ? 'FOUND' : 'NOT FOUND');

                if (!product) {
                    console.error('[IAP] Product not found. Available:', store.products.map((p: any) => p.id));
                    onAlert(t('common.error'), t('subscription.product_not_found', 'Product not found. Please try again later.'));
                    safeResetLoading();
                    return;
                }

                // NOTE: 这是修复的核心！必须用 getOffer() 获取 Offer 对象
                const offer = product.getOffer();
                console.log('[IAP] Offer:', offer ? `${offer.id} (canPurchase: ${offer.canPurchase})` : 'NO OFFER');

                if (!offer) {
                    onAlert(t('common.error'), t('subscription.no_offer', 'This product is not available for purchase right now.'));
                    safeResetLoading();
                    return;
                }

                setStatusText(t('subscription.waiting_apple', 'Waiting for App Store...'));

                // 使用 offer.order() 发起购买（返回 Promise）
                const result = await offer.order();
                console.log('[IAP] Order result:', result);

                // 如果 order 返回了错误对象
                if (result && 'isError' in result) {
                    const err = result as any;
                    console.error('[IAP] Order error:', err);
                    if (err.code !== 6777006) { // 6777006 = PAYMENT_CANCELLED
                        onAlert(t('common.error'), err.message || t('subscription.purchase_error', 'Purchase failed'));
                    }
                    safeResetLoading();
                    return;
                }

                // 购买请求已发送，等待 Apple 回调
                // 设置安全超时（60 秒，Apple 沙箱环境可能很慢）
                safetyTimeoutRef.current = setTimeout(() => {
                    console.warn('[IAP] Safety timeout triggered after 60s');
                    safeResetLoading();
                }, 60000);

            } else {
                // MOCK PURCHASE FLOW FOR WEB（开发测试用）
                const mapPlan = () => {
                    if (sku.includes('monthly')) return 'monthly' as const;
                    if (sku.includes('quarterly')) return 'quarterly' as const;
                    if (sku.includes('annual')) return 'yearly' as const;
                    return 'lifetime' as const;
                };

                setTimeout(async () => {
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
                        safeResetLoading();
                    }
                }, 1000);
            }
        } catch (error: unknown) {
            console.error('[IAP] handlePurchase error:', error);
            const err = error as { code?: number | string; message?: string };
            if (err.code !== 6777006 && err.code !== 'E_USER_CANCELLED') {
                onAlert(t('common.error'), err.message || t('common.error'));
            }
            safeResetLoading();
        }
    };

    /**
     * 恢复购买
     */
    const handleRestore = () => {
        if (!Capacitor.isNativePlatform() || !window.CdvPurchase) {
            onAlert(t('common.info', 'Info'), t('subscription.native_only'));
            return;
        }

        setIsLoading(true);
        setStatusText(t('subscription.restoring', 'Restoring purchases...'));
        const { store } = window.CdvPurchase;
        console.log('[IAP] Restoring purchases...');
        store.restore();

        // Apple Sandbox 恢复可能很慢，设置 20 秒超时
        safetyTimeoutRef.current = setTimeout(() => {
            console.warn('[IAP] Restore safety timeout after 20s');
            if (isMountedRef.current) {
                safeResetLoading();
                onAlert(t('common.info'), t('subscription.restore_complete', 'Restore check completed. If you have an active subscription, it should now be reflected.'));
            }
        }, 20000);
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
                    products.map((product) => {
                        let periodStr = '';
                        let badgeStr = '';
                        let TitleIcon = null;

                        if (product.productId.includes('monthly')) periodStr = 'mo';
                        else if (product.productId.includes('quarterly')) { periodStr = 'qr'; badgeStr = t('subscription.badge_popular'); }
                        else if (product.productId.includes('annual')) periodStr = 'yr';
                        else if (product.productId.includes('lifetime')) { periodStr = 'once'; TitleIcon = <Star size={10} className="text-purple-400" />; }

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
                    })
                )}
            </div>

            <div className="mt-4 flex flex-col items-center gap-4">
                <button
                    onClick={() => { if (selectedSku) handlePurchase(selectedSku); }}
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

            {/* Loading overlay with status text */}
            {isLoading && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-3xl z-50 gap-3">
                    <div className="w-8 h-8 border-2 border-[#F5A623] border-t-transparent rounded-full animate-spin"></div>
                    {statusText && (
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{statusText}</p>
                    )}
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
