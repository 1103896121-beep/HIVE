import React, { useState } from 'react';
import { UserPlus, Zap, Clock, ShieldAlert } from 'lucide-react';

import { clsx } from 'clsx';

const BONDS = [
    { id: 1, name: 'Lucas', status: 'focus', hours24: 6.5, subject: 'Algorithm', joinedPact: true },
    { id: 2, name: 'Sarah', status: 'break', hours24: 4.2, subject: 'UI Design', joinedPact: false },
    { id: 3, name: 'Ivan', status: 'focus', hours24: 8.0, subject: 'Physics', joinedPact: true },
    { id: 4, name: 'Elena', status: 'offline', hours24: 0, subject: '', joinedPact: false },
];

export const BondsPortal: React.FC = () => {
    const [nudged, setNudged] = useState<number | null>(null);

    const handleNudge = (id: number) => {
        setNudged(id);
        // Simulate Taptic feedback
        if (window.navigator.vibrate) {
            window.navigator.vibrate([10, 30, 10]);
        }
        setTimeout(() => setNudged(null), 2000);
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Quick Summary Card */}
            <div
                className="p-6 rounded-[32px] border transition-colors duration-500"
                style={{
                    background: 'linear-gradient(to bottom right, rgba(var(--accent-rgb), 0.15), transparent)',
                    borderColor: 'rgba(var(--accent-rgb), 0.1)'
                }}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div
                        className="p-2 rounded-xl"
                        style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.2)', color: 'var(--accent)' }}
                    >
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white tracking-tight">Active Pacts</h3>
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Shared Accountability</p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex -space-x-3">
                        {[1, 3].map(i => (
                            <div key={i} className="w-10 h-10 rounded-full border-2 border-[#111] bg-zinc-800 flex items-center justify-center overflow-hidden">
                                <img src={`https://i.pravatar.cc/150?u=${i}`} alt="avatar" className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-black" style={{ color: 'var(--accent)' }}>60m Deep Work</div>
                        <div className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>1/3 Completed Today</div>
                    </div>

                </div>
            </div>

            {/* Bonds List */}
            <div>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: 'var(--text-secondary)' }}>Your Bonds</h3>
                    <button className="flex items-center gap-1.5 text-xs font-bold hover:opacity-80" style={{ color: 'var(--accent)' }}>
                        <UserPlus size={14} /> Link New
                    </button>
                </div>


                <div className="space-y-3">
                    {BONDS.map((bond) => (
                        <div
                            key={bond.id}
                            className="flex items-center gap-4 p-5 rounded-3xl border transition-colors duration-500"
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                        >

                            {/* Avatar with Status Light */}
                            <div className="relative">
                                <div
                                    className={clsx(
                                        "w-14 h-14 rounded-[20px] overflow-hidden border-2 transition-all duration-700",
                                        bond.status === 'focus' ? "shadow-lg" : "border-zinc-800 opacity-60 grayscale"
                                    )}
                                    style={{
                                        borderColor: bond.status === 'focus' ? 'var(--accent)' : undefined,
                                        boxShadow: bond.status === 'focus' ? '0 5px 15px rgba(var(--accent-rgb), 0.2)' : undefined
                                    }}
                                >
                                    <img src={`https://i.pravatar.cc/150?u=${bond.id}`} alt={bond.name} className="w-full h-full object-cover" />
                                </div>
                                {bond.status === 'focus' && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#111] animate-pulse" style={{ backgroundColor: 'var(--accent)' }} />
                                )}

                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-bold text-white tracking-tight truncate">{bond.name}</span>
                                    {bond.joinedPact && <ShieldAlert size={12} style={{ color: 'var(--accent)' }} />}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                                        <Clock size={10} /> {bond.hours24}h Today
                                    </div>
                                    <div
                                        className="text-[9px] font-black uppercase tracking-widest truncate"
                                        style={{ color: bond.status === 'focus' ? 'rgba(var(--accent-rgb), 0.8)' : 'var(--text-secondary)' }}
                                    >
                                        {bond.status === 'focus' ? `· ${bond.subject}` : '· Not Live'}
                                    </div>
                                </div>

                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2">
                                {bond.status === 'focus' && (
                                    <button
                                        onClick={() => handleNudge(bond.id)}
                                        className={clsx(
                                            "p-3 rounded-2xl transition-all active:scale-90",
                                            nudged === bond.id
                                                ? "text-black"
                                                : "bg-white/5 text-zinc-400 hover:text-white"
                                        )}
                                        style={{ backgroundColor: nudged === bond.id ? 'var(--accent)' : undefined }}
                                    >
                                        <Zap size={18} fill={nudged === bond.id ? 'currentColor' : 'none'} className={clsx(nudged === bond.id && "animate-bounce")} />
                                    </button>

                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Achievement Comparison (24h) */}
            <div
                className="p-6 rounded-[32px] border transition-colors duration-500"
                style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.03)', borderColor: 'var(--border-color)' }}
            >
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 text-center" style={{ color: 'var(--text-secondary)' }}>Focus Intensity (24h)</h4>
                <div className="flex items-end justify-around h-24 gap-2">
                    {BONDS.map((bond) => (
                        <div key={bond.id} className="flex flex-col items-center gap-2 flex-1 max-w-[40px]">
                            <div
                                className="w-full rounded-t-lg transition-all duration-1000"
                                style={{
                                    height: `${(bond.hours24 / 10) * 100}%`,
                                    backgroundColor: bond.id === 1 ? 'var(--accent)' : 'var(--bg-hex)'
                                }}
                            />
                            <div className="text-[8px] font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>{bond.name.slice(0, 3)}</div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};
