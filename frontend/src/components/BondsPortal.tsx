import React, { useState } from 'react';
import { UserPlus, Zap, ShieldAlert, MoreVertical, XCircle } from 'lucide-react';
import type { Bond } from '../api/types';
import { clsx } from 'clsx';

interface BondsPortalProps {
    bonds: Bond[];
    userId: string;
    onNudge: (targetId: string) => void;
    onReport: (targetId: string, type: 'USER' | 'SQUAD') => void;
    onBlock: (targetId: string) => void;
}

export const BondsPortal: React.FC<BondsPortalProps> = ({ bonds, userId, onNudge, onReport, onBlock }) => {
    const [nudged, setNudged] = useState<string | null>(null);

    const handleNudge = (targetId: string) => {
        setNudged(targetId);
        onNudge(targetId);
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
                        <h3 className="font-bold text-white tracking-tight">Bond Pacts</h3>
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Shared Accountability</p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex -space-x-3">
                        {bonds.slice(0, 3).map(bond => {
                            const otherId = bond.user_id_1 === userId ? bond.user_id_2 : bond.user_id_1;
                            return (
                                <div key={otherId} className="w-10 h-10 rounded-full border-2 border-[#111] bg-zinc-800 flex items-center justify-center overflow-hidden">
                                    <img src={`https://i.pravatar.cc/150?u=${otherId}`} alt="avatar" className="w-full h-full object-cover" />
                                </div>
                            );
                        })}
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-black" style={{ color: 'var(--accent)' }}>{bonds.length} Active Bonds</div>
                        <div className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>Connected for focus</div>
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
                    {bonds.length === 0 ? (
                        <div className="p-8 text-center text-zinc-600 border border-dashed border-zinc-800 rounded-3xl font-bold uppercase text-[10px] tracking-widest">
                            No Bonds established yet
                        </div>
                    ) : (
                        bonds.map((bond) => {
                            const otherId = bond.user_id_1 === userId ? bond.user_id_2 : bond.user_id_1;
                            const isAccepted = bond.status === 'ACCEPTED';

                            return (
                                <div
                                    key={otherId}
                                    className="flex items-center gap-4 p-5 rounded-3xl border transition-colors duration-500"
                                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                                >
                                    <div className="relative">
                                        <div className={clsx(
                                            "w-14 h-14 rounded-[20px] overflow-hidden border-2 transition-all duration-700",
                                            isAccepted ? "border-[var(--accent)]" : "border-zinc-800 opacity-60"
                                        )}>
                                            <img src={`https://i.pravatar.cc/150?u=${otherId}`} alt="Avatar" className="w-full h-full object-cover" />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-bold text-white tracking-tight truncate">User {otherId.slice(0, 4)}</span>
                                            {isAccepted && <ShieldAlert size={12} style={{ color: 'var(--accent)' }} />}
                                        </div>
                                        <div className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                                            Status: {bond.status}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {isAccepted && (
                                            <button
                                                onClick={() => handleNudge(otherId)}
                                                className={clsx(
                                                    "p-3 rounded-2xl transition-all active:scale-90",
                                                    nudged === otherId
                                                        ? "text-black"
                                                        : "bg-white/5 text-zinc-400 hover:text-white"
                                                )}
                                                style={{ backgroundColor: nudged === otherId ? 'var(--accent)' : undefined }}
                                            >
                                                <Zap size={18} fill={nudged === otherId ? 'currentColor' : 'none'} className={clsx(nudged === otherId && "animate-bounce")} />
                                            </button>
                                        )}
                                        <div className="relative group/menu">
                                            <button className="p-2 text-zinc-600 hover:text-white transition-colors">
                                                <MoreVertical size={16} />
                                            </button>
                                            <div className="absolute right-0 top-full mt-2 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 hidden group-hover/menu:block z-50">
                                                <button
                                                    onClick={() => onReport(otherId, 'USER')}
                                                    className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:bg-white/5 flex items-center gap-2"
                                                >
                                                    <ShieldAlert size={12} /> Report
                                                </button>
                                                <button
                                                    onClick={() => onBlock(otherId)}
                                                    className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-white/5 flex items-center gap-2"
                                                >
                                                    <XCircle size={12} /> Block
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
