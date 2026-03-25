import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.qingning.hive',
    appName: 'Hive',
    webDir: 'dist',
    server: {
        androidScheme: 'https'
    }
};

export default config;
