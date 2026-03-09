import React, { useState, useRef } from 'react';
import { Camera, Edit2, Check, Award, Flame, Target, Info, ExternalLink, ShieldCheck } from 'lucide-react';


export interface UserProfile {
    name: string;
    avatar: string;
    bio: string;
    goal: number; // 每日专注目标(分钟)
    totalFocus: number; // 累计专注时长(分钟)
    sparks: number; // 累计获得的 Sparks
}

interface ProfilePortalProps {
    userId: string;
    profile: UserProfile;
    onUpdate: (updates: Partial<UserProfile>) => Promise<void>;
}

export function ProfilePortal({ profile, onUpdate }: ProfilePortalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(profile);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // 真实场景下应上传到服务器并返回 URL
            const url = URL.createObjectURL(file);
            await onUpdate({ avatar: url });
        }
    };

    const handleSave = async () => {
        await onUpdate(editForm);
        setIsEditing(false);
    };

    return (
        <div className="flex flex-col gap-6 py-2 px-1">
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
                            placeholder="Your Name"
                        />
                        <textarea
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-center text-xs text-zinc-400 focus:outline-none focus:border-[var(--accent)] resize-none"
                            rows={2}
                            value={editForm.bio}
                            onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                            placeholder="Tell us about your drive..."
                        />
                    </div>
                ) : (
                    <div className="mt-5 text-center">
                        <h2 className="text-2xl font-black text-white tracking-tight">{profile.name}</h2>
                        <p className="mt-2 text-xs text-zinc-500 italic max-w-[200px] leading-relaxed">"{profile.bio}"</p>
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
                    {isEditing ? <><Check size={12} strokeWidth={3} /> Save Profile</> : <><Edit2 size={12} /> Edit Profile</>}
                </button>
            </div>

            {/* 统计数据网格 */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-5 rounded-3xl border transition-colors duration-500"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2 mb-3 opacity-60">
                        <Flame size={14} style={{ color: 'var(--accent)' }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Sparks</span>
                    </div>
                    <div className="text-2xl font-black text-white">{profile.sparks}</div>
                    <div className="text-[9px] text-zinc-600 font-bold uppercase mt-1">Global Ranking: Top 5%</div>
                </div>

                <div className="p-5 rounded-3xl border transition-colors duration-500"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2 mb-3 opacity-60">
                        <Award size={14} style={{ color: 'var(--accent)' }} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Deep Focus</span>
                    </div>
                    <div className="text-2xl font-black text-white">{Math.floor(profile.totalFocus / 60)}h <span className="text-sm">{profile.totalFocus % 60}m</span></div>
                    <div className="text-[9px] text-zinc-600 font-bold uppercase mt-1">Across 12 Hives</div>
                </div>
            </div>

            {/* 专注目标设置 */}
            <div className="p-6 rounded-[32px] border transition-colors duration-500"
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Target size={18} style={{ color: 'var(--accent)' }} />
                        <span className="text-xs font-black uppercase tracking-widest text-white">Daily Focus Goal</span>
                    </div>
                    {isEditing && (
                        <div className="text-[var(--accent)] font-bold text-sm tracking-tighter">{editForm.goal}m</div>
                    )}
                </div>

                {isEditing ? (
                    <input
                        type="range"
                        min="30"
                        max="480"
                        step="15"
                        value={editForm.goal}
                        onChange={e => setEditForm({ ...editForm, goal: parseInt(e.target.value) })}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[var(--accent)] bg-white/10"
                    />
                ) : (
                    <div className="space-y-3">
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                            <div
                                className="h-full transition-all duration-1000"
                                style={{
                                    width: `${Math.min((profile.totalFocus / profile.goal) * 100, 100)}%`,
                                    backgroundColor: 'var(--accent)',
                                    boxShadow: '0 0 10px rgba(var(--accent-rgb), 0.5)'
                                }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            <span>Completed: {profile.totalFocus}m</span>
                            <span>Target: {profile.goal}m</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <Info size={14} className="text-zinc-600 mt-0.5" />
                <p className="text-[10px] text-zinc-600 leading-relaxed italic">
                    Your profile is visible to your Bonds and fellow Hive members. Let your statistics demonstrate your discipline.
                </p>
            </div>

            {/* Legal Links for App Store */}
            <div className="mt-4 pt-6 border-t border-white/[0.05] flex flex-col gap-3">
                <a href="/eula.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-[24px] bg-white/[0.03] hover:bg-white/[0.05] transition-colors border border-white/[0.03]">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={14} className="text-zinc-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">User Agreement (EULA)</span>
                    </div>
                    <ExternalLink size={12} className="text-zinc-600" />
                </a>
                <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 rounded-[24px] bg-white/[0.03] hover:bg-white/[0.05] transition-colors border border-white/[0.03]">
                    <div className="flex items-center gap-2">
                        <Info size={14} className="text-zinc-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Privacy Policy</span>
                    </div>
                    <ExternalLink size={12} className="text-zinc-600" />
                </a>
            </div>
        </div>
    );
}
