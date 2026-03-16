import { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authService } from '../api';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { Capacitor } from '@capacitor/core';

interface AuthPageProps {
    onSuccess: (userId: string, token: string) => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 基础字段校验
        if (!email || !password || (mode === 'register' && !name)) {
            setError(mode === 'register' ? t('auth.fields_required') : t('auth.credentials_required'));
            triggerShake();
            return;
        }

        setLoading(true);
        setError('');
        try {
            if (mode === 'login') {
                const resp = await authService.login({ email, password });
                onSuccess(resp.user_id, resp.access_token);
            } else {
                const resp = await authService.register({ email, password, name });
                onSuccess(resp.user_id, resp.access_token);
            }
        } catch (err: unknown) {
            setError((err as Error).message || t('auth.failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleAppleSignIn = async () => {
        try {
            setLoading(true);
            setError('');
            
            if (Capacitor.isNativePlatform()) {
                const result = await SignInWithApple.authorize({
                    clientId: 'com.hive.app', 
                    redirectURI: '',
                    scopes: 'email name',
                    state: '12345',
                    nonce: 'nonce',
                });
                
                if (result.response && result.response.identityToken) {
                    const fullName = result.response.givenName ? `${result.response.givenName} ${result.response.familyName}`.trim() : 'Apple User';
                    const resp = await authService.appleLogin(result.response.identityToken, fullName);
                    onSuccess(resp.user_id, resp.access_token);
                } else {
                    throw new Error('No identity token returned');
                }
            } else {
                // MOCK APPLE SIGN IN FOR WEB PREVIEW
                setTimeout(async () => {
                    try {
                        const resp = await authService.appleLogin('mock-web-token', 'Web User');
                        onSuccess(resp.user_id, resp.access_token);
                    } catch(e) {
                         setError('Mock Apple login failed');
                         setLoading(false);
                    }
                }, 1000);
            }
        } catch (e: unknown) {
             setError((e as Error).message || 'Apple Sign in error');
             setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-black p-6 font-sans">
            {/* Background ambient glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#F5A623]/10 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#F5A623]/5 blur-[120px]"></div>
            </div>

            <div className="w-full max-w-[400px] z-10 animate-in fade-in zoom-in-95 duration-700">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-20 h-20 bg-[#F5A623] rounded-[24px] flex items-center justify-center shadow-[0_0_40px_rgba(245,166,35,0.3)] mb-6 transform hover:rotate-12 transition-transform duration-500">
                        <Zap size={40} className="text-black fill-current" />
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">Hive</h1>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">{t('auth.deep_work_community')}</p>
                </div>

                <div className={`glass-nav backdrop-blur-2xl p-8 rounded-[40px] border border-white/10 shadow-2xl ${isShaking ? 'animate-shake' : ''}`}>
                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                        {mode === 'register' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t('auth.full_name')}</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#F5A623] transition-colors" size={18} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#F5A623]/50 focus:bg-white/[0.08] transition-all"
                                        placeholder={t('auth.name_placeholder')}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t('auth.email')}</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#F5A623] transition-colors" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#F5A623]/50 focus:bg-white/[0.08] transition-all"
                                    placeholder={t('auth.email_placeholder')}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t('auth.password')}</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#F5A623] transition-colors" size={18} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#F5A623]/50 focus:bg-white/[0.08] transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#F5A623] hover:bg-[#F5A111] text-black font-black uppercase tracking-widest py-4 rounded-2xl mt-4 flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all shadow-[0_10px_30px_rgba(245,166,35,0.2)]"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    {mode === 'login' ? t('auth.enter_hive') : t('auth.create_account')}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <button
                        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                        className="w-full text-center mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors"
                    >
                        {mode === 'login' ? t('auth.no_account') : t('auth.already_member')}
                    </button>

                    <div className="flex items-center gap-3 mt-6 mb-6">
                        <div className="flex-1 h-px bg-white/10"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{t('auth.or', 'OR')}</span>
                        <div className="flex-1 h-px bg-white/10"></div>
                    </div>

                    {/* Apple Sign In Button Mock */}
                    <button
                        type="button"
                        onClick={handleAppleSignIn}
                        className="w-full bg-white text-black font-bold uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transform active:scale-[0.98] transition-all"
                    >
                         {t('auth.continue_with_apple', 'Continue with Apple')}
                    </button>

                </div>

                <p className="text-center mt-12 text-[9px] text-zinc-700 font-bold uppercase tracking-[0.1em] leading-relaxed max-w-[280px] mx-auto">
                    {t('auth.agree_terms')} <a href="/eula.html" className="text-zinc-500 hover:underline">{t('legal.eula')}</a> {t('auth.and', 'and')} <a href="/privacy.html" className="text-zinc-500 hover:underline">{t('legal.privacy_policy')}</a>.
                </p>
            </div>
        </div>
    );
}
