/**
 * NOTE: cordova-plugin-purchase v13 在原生环境中注入 window.CdvPurchase
 * 此声明文件让 TypeScript 编译器在构建时不报错
 */
interface Window {
    CdvPurchase?: {
        store: any;
        ProductType: { PAID_SUBSCRIPTION: string; NON_CONSUMABLE: string };
        Platform: { APPLE_APPSTORE: string };
    };
}
