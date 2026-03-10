import React, { useState } from 'react';
import { Plus, ShieldCheck, DoorOpen, Trash2 } from 'lucide-react';
import type { Squad } from '../api/types';

interface SquadPortalProps {
    squads: Squad[];
    userId: string;
    onApply: (squadId: string) => Promise<void>;
    onCreate: (name: string) => Promise<void>;
    onLeave: (squadId: string) => Promise<void>;
    onDisband: (squadId: string) => Promise<void>;
}

export const SquadPortal: React.FC<SquadPortalProps> = ({ squads, userId, onApply, onCreate, onLeave, onDisband }) => {
    const [newSquadName, setNewSquadName] = useState('');
    const [targetSquadId, setTargetSquadId] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Enforce 1-squad rule visually
    const currentSquad = squads.length > 0 ? squads[0] : null;

    return (
        <div className="space-y-8">
            {!currentSquad ? (
                // User is not in a squad
                <div className="flex flex-col gap-4">
                    {isCreating ? (
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                            <input
                                placeholder="Hive Name"
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)]"
                                value={newSquadName}
                                onChange={e => setNewSquadName(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { onCreate(newSquadName); setIsCreating(false); }}
                                    className="flex-1 py-2 rounded-xl font-bold uppercase text-[10px]"
                                    style={{ backgroundColor: 'var(--accent)', color: 'black' }}
                                >Confirm</button>
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-2 rounded-xl border border-white/10 text-zinc-400 font-bold uppercase text-[10px]"
                                >Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setIsCreating(true)}
                                className="flex flex-col items-center justify-center p-6 rounded-3xl text-black hover:scale-[1.02] transition-transform active:scale-95 shadow-xl"
                                style={{ backgroundColor: 'var(--accent)', boxShadow: '0 10px 30px rgba(var(--accent-rgb), 0.2)' }}
                            >
                                <Plus size={28} strokeWidth={3} />
                                <span className="mt-2 text-center font-bold uppercase tracking-tighter leading-tight">Create Hive</span>
                            </button>

                            <div className="flex flex-col justify-center p-4 rounded-3xl bg-white/5 border border-white/10 text-white">
                                <input
                                    placeholder="Enter Hive ID"
                                    className="bg-transparent border-b border-white/10 mb-2 text-center text-xs outline-none focus:border-[var(--accent)] transition-colors"
                                    value={targetSquadId}
                                    onChange={e => setTargetSquadId(e.target.value)}
                                />
                                <button
                                    onClick={() => onApply(targetSquadId)}
                                    className="text-[10px] py-1 rounded-lg font-black uppercase tracking-widest text-[var(--accent)] hover:bg-white/5 active:scale-95 transition-all"
                                >Apply to Join</button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // User is in a squad
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-4 px-1" style={{ color: 'var(--text-secondary)' }}>Your Active Hive</h3>
                    <div className="w-full flex items-center justify-between p-5 rounded-3xl border transition-all text-left bg-white/5 border-white/10">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg text-white tracking-tight">{currentSquad.name}</span>
                            </div>
                            <div className="flex flex-col gap-2 mt-3">
                                <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-400 font-bold uppercase">
                                    <div className="flex items-center gap-1 text-[var(--accent)]">
                                        <ShieldCheck size={12} />
                                        {currentSquad.created_by === userId ? "Admin" : "Member"}
                                    </div>
                                    <span className="text-[8px] text-zinc-600 font-mono tracking-tighter truncate w-32">ID: {currentSquad.id}</span>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    {currentSquad.created_by === userId ? (
                                        <button
                                            onClick={() => onDisband(currentSquad.id)}
                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 active:scale-95 transition-all text-[10px] font-bold uppercase tracking-widest"
                                        >
                                            <Trash2 size={12} /> Disband
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onLeave(currentSquad.id)}
                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10 active:scale-95 transition-all text-[10px] font-bold uppercase tracking-widest"
                                        >
                                            <DoorOpen size={12} /> Leave
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
