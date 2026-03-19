import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Edit2, Check, Award, Flame, Info, ExternalLink, ShieldCheck, KeyRound, MapPin, Navigation, Loader2, Eye, EyeOff, Zap } from 'lucide-react';
import { validateContent, validateImage } from '../utils/validation';
import { userService } from '../api';
import clsx from 'clsx';


export interface UserProfile {
    name: string;
    avatar: string;
    bio: string;
    city: string;
    totalFocus: number; // 累计专注时长(分钟)
    sparks: number; // 累计获得的 Sparks
    trialStartAt: string;
    subscriptionEndAt?: string;
    latitude?: number;
    longitude?: number;
    showLocation: boolean;
}

interface ProfilePortalProps {
    userId: string;
    profile: UserProfile;
    onUpdate: (updates: Partial<UserProfile>) => Promise<void>;
    onSignOut: () => void;
    onAlert: (title: string, message: string) => void;
}

export function ProfilePortal({ userId, profile, onUpdate, onSignOut, onAlert }: ProfilePortalProps) {
    const { t, i18n } = useTranslation();
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(profile);
    const [isSyncingLocation, setIsSyncingLocation] = useState(false);
    
    // Password change state
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync form with profile when not editing
    useEffect(() => {
        if (!isEditing) {
            setEditForm(profile);
        }
    }, [profile, isEditing]);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const validation = validateImage(file);
            if (!validation.isValid) {
                onAlert(t('common.error'), t(validation.errorKey as Parameters<typeof t>[0]));
                return;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                await onUpdate({ avatar: base64String });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        const nameCheck = validateContent(editForm.name, 'name');
        if (!nameCheck.isValid) return onAlert(t('common.error'), t(nameCheck.errorKey as Parameters<typeof t>[0]));

        const cityCheck = validateContent(editForm.city || '', 'city');
        if (!cityCheck.isValid && editForm.city) return onAlert(t('common.error'), t(cityCheck.errorKey as Parameters<typeof t>[0]));

        const bioCheck = validateContent(editForm.bio, 'bio');
        if (!bioCheck.isValid) return onAlert(t('common.error'), t(bioCheck.errorKey as Parameters<typeof t>[0]));

        await onUpdate(editForm);
        setIsEditing(false);
    };

    const handleSyncLocation = async () => {
        if (!navigator.geolocation) {
            onAlert(t('common.error'), 'Geolocation not supported');
            return;
        }

        setIsSyncingLocation(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
                const data = await response.json();
                const city = data.address.city || data.address.town || data.address.village || data.address.state || '';
                
                await onUpdate({ 
                    city, 
                    latitude, 
                    longitude 
                });
                onAlert(t('common.success'), t('profile.location_synced'));
            } catch (error) {
                console.error('Location sync failed:', error);
                onAlert(t('common.error'), t('profile.location_failed'));
            } finally {
                setIsSyncingLocation(false);
            }
        }, (error) => {
            console.error('Geolocation error:', error);
            onAlert(t('common.error'), t('profile.location_failed'));
            setIsSyncingLocation(false);
        });
    };

    const handleChangePassword = async () => {
        if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
            onAlert(t('common.error'), t('validation.empty_required_field'));
            return;
        }

        if (passwordData.new !== passwordData.confirm) {
            onAlert(t('common.error'), t('profile.passwords_not_match'));
            return;
        }

        setIsUpdatingPassword(true);
        try {
            await userService.updatePassword(userId, {
                current_password: passwordData.current,
                new_password: passwordData.new,
                confirm_password: passwordData.confirm
            });
            onAlert(t('common.success'), t('common.success'));
            setShowPasswordForm(false);
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (err: unknown) {
            onAlert(t('common.error'), (err as {response?: {data?: {detail?: string}}}).response?.data?.detail || t('common.error'));
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 py-2 px-1 pb-10">
            {/* 头像与基本信息卡片 */}
            <div className="relative flex flex-col items-center p-8 rounded-[40px] border transition-colors duration-500 overflow-hidden"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>

                {/* 背景光晕 */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full blur-[60px] opacity-20 pointer-events-none"
                    style={{ backgroundColor: 'var(--accent)' }}></div>

                {/* 头像容器 */}
                <div className="relative group cursor-pointer active:scale-95 transition-transform" onClick={handleAvatarClick}>
                    <div className="w-24 h-24 rounded-full border-2 p-1 transition-colors duration-500"
                        style={{ borderColor: 'rgba(var(--accent-rgb), 0.3)' }}>
                        <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                            <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 right-0 p-2 rounded-full shadow-lg border-2 border-[#111] transition-transform group-hover:scale-110"
                        style={{ backgroundColor: 'var(--accent)', color: 'black' }}>
                        <Camera size={14} strokeWidth={3} />
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                </div>

                {/* 姓名与简介 */}
                {isEditing ? (
                    <div className="mt-6 w-full space-y-3">
                        <input
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-lg font-bold text-white focus:outline-none focus:border-[var(--accent)]"
                            value={editForm.name}
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder={t('profile.your_name')}
                        />
                        <div className="flex items-center justify-center gap-3 py-1">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                                <MapPin size={10} className={clsx(profile.showLocation ? "text-[var(--accent)]" : "text-zinc-500")} />
                                <span className={clsx("text-[9px] font-bold uppercase tracking-widest", profile.showLocation ? "text-white" : "text-zinc-500")}>
                                    {profile.showLocation ? (profile.city || t('common.digital_space')) : t('profile.hide_location')}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleSyncLocation}
                                    disabled={isSyncingLocation}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-[var(--accent)] transition-colors active:scale-90"
                                    title={t('profile.sync_location')}
                                >
                                    {isSyncingLocation ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                                </button>
                                <button
                                    onClick={() => setEditForm({ ...editForm, showLocation: !editForm.showLocation })}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors active:scale-90"
                                    title={editForm.showLocation ? t('profile.hide_location') : t('profile.show_location')}
                                >
                                    {editForm.showLocation ? <Eye size={12} /> : <EyeOff size={12} />}
                                </button>
                            </div>
                        </div>
                        <textarea
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-xs text-zinc-400 focus:outline-none focus:border-[var(--accent)] resize-none"
                            rows={2}
                            value={editForm.bio}
                            onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                            placeholder={t('profile.bio_placeholder')}
                        />
                    </div>
                ) : (
                    <div className="mt-5 text-center">
                        <h2 className="text-2xl font-black text-white tracking-tight">{profile.name}</h2>
                        {profile.showLocation && profile.city ? (
                            <div className="flex items-center justify-center gap-1 mt-1">
                                <MapPin size={10} className="text-[var(--accent)]" />
                                <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-[0.2em]">{profile.city}</p>
                            </div>
                        ) : (
                            <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mt-1">{t('common.digital_space')}</p>
                        )}
                        <p className="mt-3 text-xs text-zinc-500 italic max-w-[200px] leading-relaxed mx-auto">"{profile.bio || t('profile.no_bio')}"</p>
                    </div>
                )}

                {/* 编辑切换按钮 */}
                <button
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    className="mt-6 flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                    style={{
                        backgroundColor: isEditing ? 'var(--accent)' : 'rgba(var(--accent-rgb), 0.1)',
                        color: isEditing ? 'black' : 'var(--accent)',
                        border: isEditing ? 'none' : '1px solid rgba(var(--accent-rgb), 0.2)'
                    }}
                >
                    {isEditing ? <><Check size={12} strokeWidth={3} /> {t('profile.save_profile')}</> : <><Edit2 size={12} /> {t('profile.edit_profile')}</>}
                </button>
            </div>


            {/* 统计数据网格 */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-3xl border transition-colors duration-500"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2 mb-3 opacity-60">
                        <Flame size={14} style={{ color: 'var(--accent)' }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('profile.total_sparks_label')}</span>
                    </div>
                    <div className="text-2xl font-black text-white">{profile.sparks}</div>
                    <div className="text-[9px] text-zinc-600 font-bold uppercase mt-1">{t('profile.global_ranking')}</div>
                </div>

                <div className="p-5 rounded-3xl border transition-colors duration-500"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2 mb-3 opacity-60">
                        <Award size={14} style={{ color: 'var(--accent)' }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('profile.deep_focus_label')}</span>
                    </div>
                    <div className="text-2xl font-black text-white">{Math.floor(profile.totalFocus / 60)}h <span className="text-sm">{profile.totalFocus % 60}m</span></div>
                    <div className="text-[9px] text-zinc-600 font-bold uppercase mt-1">{t('profile.completed', { count: profile.totalFocus })}</div>
                </div>
            </div>

            {/* Subscription Status Block */}
            <div className="p-5 rounded-3xl border transition-colors duration-500 flex flex-col gap-3"
                style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.05)', borderColor: 'rgba(var(--accent-rgb), 0.1)' }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                            <Zap size={14} className="text-[var(--accent)] fill-current" />
                        </div>
                        <div>
                            <div className="text-sm font-black text-white tracking-tight">{t('profile.subscription_status')}</div>
                            <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                                {(() => {
                                    const now = new Date();
                                    const subEnd = profile.subscriptionEndAt ? new Date(profile.subscriptionEndAt) : null;
                                    const trialStart = new Date(profile.trialStartAt);
                                    const trialEnd = new Date(trialStart.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 Days

                                    if (subEnd && subEnd > now) {
                                        const days = Math.ceil((subEnd.getTime() - now.getTime()) / (1000 * 3600 * 24));
                                        return t('profile.active_days_left', { count: days, defaultValue: '{{count}} Days Remaining' });
                                    } else if (trialEnd > now) {
                                        const days = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 3600 * 24));
                                        return t('profile.trial_days_left', { count: days, defaultValue: 'Trial: {{count}} Days Left' });
                                    } else {
                                        return t('profile.expired', 'Expired');
                                    }
                                })()}
                            </div>
                        </div>
                    </div>
                    {/* Renewal Button */}
                    <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-subscription'))}
                        className="px-4 py-2 bg-[var(--accent)] text-black rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                    >
                        {t('profile.renew', 'Renew')}
                    </button>
                </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <Info size={14} className="text-zinc-600 mt-0.5" />
                <p className="text-[10px] text-zinc-600 leading-relaxed italic">
                    {t('profile.visible_info')}
                </p>
            </div>

            {/* Legal Links for App Store */}
            <div className="mt-4 pt-6 border-t border-white/[0.05] flex flex-col gap-3">
                <a
                    href={i18n.language === 'zh-CN' ? '/eula.html' : i18n.language === 'zh-TW' ? '/eula_tw.html' : '/eula_en.html'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-[24px] bg-white/[0.03] hover:bg-white/[0.05] transition-colors border border-white/[0.03]"
                >
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-zinc-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('legal.eula')}</span>
                    </div>
                    <ExternalLink size={12} className="text-zinc-600" />
                </a>
                <a
                    href={i18n.language === 'zh-CN' ? '/privacy.html' : i18n.language === 'zh-TW' ? '/privacy_tw.html' : '/privacy_en.html'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-[24px] bg-white/[0.03] hover:bg-white/[0.05] transition-colors border border-white/[0.03]"
                >
                    <div className="flex items-center gap-2">
                        <Info size={14} className="text-zinc-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('legal.privacy_policy')}</span>
                    </div>
                    <ExternalLink size={12} className="text-zinc-600" />
                </a>
            </div>

            {/* Change Password - Moved to bottom and shrunken */}
            <div className="flex flex-col gap-2 mt-4">
                <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="flex items-center justify-between px-5 py-3 rounded-[20px] bg-white/[0.02] hover:bg-white/[0.04] transition-all border border-white/[0.03] group active:scale-[0.98]"
                >
                    <div className="flex items-center gap-2.5">
                        <KeyRound size={12} className="text-purple-400" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{t('profile.change_password')}</span>
                    </div>
                    <ChevronRight size={12} className={clsx("text-zinc-700 transition-transform", showPasswordForm && "rotate-90")} />
                </button>
                
                {showPasswordForm && (
                    <div className="p-4 rounded-[20px] bg-purple-500/[0.02] border border-purple-500/10 flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-300">
                        <input
                            type="password"
                            className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none focus:border-purple-500/50"
                            placeholder={t('profile.current_password')}
                            value={passwordData.current}
                            onChange={e => setPasswordData({ ...passwordData, current: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="password"
                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none focus:border-purple-500/50"
                                placeholder={t('profile.new_password')}
                                value={passwordData.new}
                                onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
                            />
                            <input
                                type="password"
                                className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white focus:outline-none focus:border-purple-500/50"
                                placeholder={t('profile.confirm_password')}
                                value={passwordData.confirm}
                                onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
                            />
                        </div>
                        <button
                            onClick={handleChangePassword}
                            disabled={isUpdatingPassword}
                            className="w-full py-2 rounded-lg bg-purple-600/80 hover:bg-purple-600 text-white text-[9px] font-black uppercase tracking-widest active:scale-95 disabled:opacity-50 transition-all border border-purple-400/20"
                        >
                            {isUpdatingPassword ? <Loader2 size={10} className="animate-spin mx-auto" /> : t('common.save')}
                        </button>
                    </div>
                )}
            </div>

            {/* Logout Button */}
            <button
                onClick={onSignOut}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-[24px] bg-red-500/10 hover:bg-red-500/20 transition-all border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest"
            >
                {t('common.sign_out')}
            </button>

            {/* Account Deletion - App Store Compliance */}
            <button
                onClick={async () => {
                    if (window.confirm(t('profile.delete_account_confirm'))) {
                        try {
                            await userService.deleteAccount(userId);
                            onSignOut();
                        } catch (err) {
                            onAlert(t('common.error'), t('common.error'));
                        }
                    }
                }}
                className="w-full mt-2 text-[8px] font-bold text-zinc-700 hover:text-red-900 uppercase tracking-tighter transition-colors py-2"
            >
                {t('profile.delete_account')}
            </button>
        </div>
    );
}

const ChevronRight = ({ className, size }: { className?: string, size?: number }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size || 24} 
        height={size || 24} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="m9 18 6-6-6-6" />
    </svg>
);
