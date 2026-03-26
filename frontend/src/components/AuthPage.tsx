import { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Zap, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authService } from '../api';
import { setAuthToken } from '../api/client';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { validateContent } from '../utils/validation';

interface AuthPageProps {
    onSuccess: (userId: string) => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
    const { t, i18n } = useTranslation();
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [resetCode, setResetCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 基础字段校验
        if (mode === 'login' && (!email || !password)) {
            setError(t('auth.credentials_required'));
            triggerShake();
            return;
        }
        if (mode === 'register' && (!email || !password || !name)) {
            setError(t('auth.fields_required'));
            triggerShake();
            return;
        }
        if ((mode === 'register' || mode === 'reset') && password !== confirmPassword) {
            setError(t('auth.passwords_dont_match', "Passwords don't match"));
            triggerShake();
            return;
        }
        if (mode === 'forgot' && !email) {
            setError(t('auth.email_required', 'Email is required'));
            triggerShake();
            return;
        }
        if (mode === 'reset' && (!email || !resetCode || !password)) {
            setError(t('auth.all_fields_required', 'All fields are required'));
            triggerShake();
            return;
        }

        setLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            if (mode === 'register') {
                const nameCheck = validateContent(name, 'name');
                if (!nameCheck.isValid) {
                    setError(t(nameCheck.errorKey as any));
                    setLoading(false);
                    triggerShake();
                    return;
                }
            }

            if (mode === 'login') {
                const resp = await authService.login({ email, password });
                setAuthToken(resp.access_token);
                onSuccess(resp.user_id);
            } else if (mode === 'register') {
                const resp = await authService.register({ email, password, name });
                setAuthToken(resp.access_token);
                onSuccess(resp.user_id);
            } else if (mode === 'forgot') {
                await authService.forgotPassword(email);
                setSuccessMessage(t('auth.reset_code_sent', 'Check your email for reset code'));
                setTimeout(() => setMode('reset'), 1500);
            } else if (mode === 'reset') {
                await authService.resetPassword({ email, code: resetCode, new_password: password });
                setSuccessMessage(t('auth.password_reset_success', 'Password reset successfully. Please login.'));
                setTimeout(() => setMode('login'), 2000);
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
                    clientId: 'com.qingning.hive', 
                    redirectURI: '',
                    scopes: 'email name',
                    state: '12345',
                    nonce: 'nonce',
                });
                
                if (result.response && result.response.identityToken) {
                    const fullName = result.response.givenName ? `${result.response.givenName} ${result.response.familyName}`.trim() : 'Apple User';
                    const resp = await authService.appleLogin(result.response.identityToken, fullName);
                    setAuthToken(resp.access_token);
                    onSuccess(resp.user_id);
                } else {
                    throw new Error(t('auth.token_missing'));
                }
            } else {
                // MOCK APPLE SIGN IN FOR WEB PREVIEW
                setTimeout(async () => {
                    try {
                        const resp = await authService.appleLogin('mock-web-token', 'Web User');
                        setAuthToken(resp.access_token);
                        onSuccess(resp.user_id);
                    } catch(e) {
                         setError(t('auth.apple_failed'));
                         setLoading(false);
                    }
                }, 1000);
            }
        } catch (e: unknown) {
             setError((e as Error).message || t('auth.apple_failed'));
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
                    <div className="mb-6">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">
                            {mode === 'login' && t('auth.welcome_back')}
                            {mode === 'register' && t('auth.join_hive')}
                            {mode === 'forgot' && t('auth.forgot_password', 'Reset Password')}
                            {mode === 'reset' && t('auth.enter_new_password', 'New Password')}
                        </h2>
                    </div>

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
                                    disabled={mode === 'reset'}
                                />
                            </div>
                        </div>

                        {mode === 'reset' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">{t('auth.reset_code', 'Verification Code')}</label>
                                <div className="relative group">
                                    <Zap className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#F5A623] transition-colors" size={18} />
                                    <input
                                        type="text"
                                        value={resetCode}
                                        onChange={(e) => setResetCode(e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#F5A623]/50 focus:bg-white/[0.08] transition-all"
                                        placeholder="123456"
                                    />
                                </div>
                            </div>
                        )}

                        {(mode !== 'forgot') && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                        {mode === 'reset' ? t('auth.new_password', 'New Password') : t('auth.password')}
                                    </label>
                                    {mode === 'login' && (
                                        <button
                                            type="button"
                                            onClick={() => setMode('forgot')}
                                            className="text-[9px] font-black uppercase tracking-widest text-[#F5A623]/70 hover:text-[#F5A623] transition-colors"
                                        >
                                            {t('auth.forgot_password', 'Forgot?')}
                                        </button>
                                    )}
                                </div>
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
                        )}

                        {(mode === 'register' || mode === 'reset') && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">
                                    {t('auth.confirm_password', 'Confirm Password')}
                                </label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-[#F5A623] transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-[#F5A623]/50 focus:bg-white/[0.08] transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        {successMessage && (
                            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-2">
                                {successMessage}
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
                                    {mode === 'login' && t('auth.enter_hive')}
                                    {mode === 'register' && t('auth.create_account')}
                                    {mode === 'forgot' && t('auth.send_reset_code', 'Send Reset Code')}
                                    {mode === 'reset' && t('auth.update_password', 'Update Password')}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <button
                        onClick={() => {
                            if (mode === 'forgot' || mode === 'reset') setMode('login');
                            else setMode(mode === 'login' ? 'register' : 'login');
                            setError('');
                            setSuccessMessage('');
                        }}
                        className="w-full text-center mt-8 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors"
                    >
                        {(mode === 'forgot' || mode === 'reset') ? t('auth.back_to_login', 'Back to Login') : (mode === 'login' ? t('auth.no_account') : t('auth.already_member'))}
                    </button>

                    {(mode === 'login' || mode === 'register') && (
                        <>
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
                        </>
                    )}

                </div>

                <p className="text-center mt-12 text-[9px] text-zinc-700 font-bold uppercase tracking-[0.1em] leading-relaxed max-w-[280px] mx-auto">
                    {t('auth.agree_terms')}{' '}
                    <button type="button" onClick={() => { const path = i18n.language.includes('zh') ? '/eula.html' : '/eula_en.html'; const url = 'https://1103896121-beep.github.io/HIVE' + path; if (Capacitor.isNativePlatform()) { Browser.open({ url }); } else { window.open(url, '_blank'); } }} className="text-zinc-500 hover:underline">{t('legal.eula')}</button>
                    {' '}{t('auth.and', 'and')}{' '}
                    <button type="button" onClick={() => { const path = i18n.language.includes('zh') ? '/privacy.html' : '/privacy_en.html'; const url = 'https://1103896121-beep.github.io/HIVE' + path; if (Capacitor.isNativePlatform()) { Browser.open({ url }); } else { window.open(url, '_blank'); } }} className="text-zinc-500 hover:underline">{t('legal.privacy_policy')}</button>.
                </p>
            </div>
        </div>
    );
}

// 注意：handleAppleSignIn 保持原样，由于篇幅原因省略代码块
