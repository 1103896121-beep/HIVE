import React, { useState } from 'react';
import { Users, Plus, ShieldCheck, MoreVertical, ShieldAlert } from 'lucide-react';
import type { Squad } from '../api/types';

interface SquadPortalProps {
    squads: Squad[];
    onJoin: (inviteCode: string) => Promise<void>;
    onCreate: (name: string) => Promise<void>;
    onReport: (targetId: string, type: 'USER' | 'SQUAD') => void;
}

export const SquadPortal: React.FC<SquadPortalProps> = ({ squads, onJoin, onCreate, onReport }) => {
    const [newSquadName, setNewSquadName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    return (
        <div className="space-y-8">
            {/* Action Buttons */}
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
                            <span className="mt-2 font-bold uppercase tracking-tighter">Create Hive</span>
                        </button>

                        <div className="flex flex-col p-4 rounded-3xl bg-white/5 border border-white/10 text-white">
                            <input
                                placeholder="Invite Code"
                                className="bg-transparent border-b border-white/10 mb-2 text-center text-xs outline-none"
                                value={inviteCode}
                                onChange={e => setInviteCode(e.target.value)}
                            />
                            <button
                                onClick={() => onJoin(inviteCode)}
                                className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]"
                            >Join by Code</button>
                        </div>
                    </div>
                )}
            </div>

            {/* My Squads */}
            <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-4 px-1" style={{ color: 'var(--text-secondary)' }}>Your Hives</h3>
                <div className="space-y-3">
                    {squads.length === 0 ? (
                        <div className="p-8 text-center text-zinc-600 border border-dashed border-zinc-800 rounded-3xl">
                            <Users className="mx-auto mb-2 opacity-20" size={32} />
                            <div className="text-[10px] uppercase font-bold tracking-widest">No Hives Joined Yet</div>
                        </div>
                    ) : (
                        squads.map((squad) => (
                            <div
                                key={squad.id}
                                className="w-full flex items-center justify-between p-5 rounded-3xl border transition-all text-left"
                                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-lg text-white tracking-tight">{squad.name}</span>
                                        <span className="px-2 py-0.5 rounded-full bg-white/5 text-zinc-500 text-[8px] font-black uppercase tracking-widest">{squad.invite_code}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase">
                                            <ShieldCheck size={12} />
                                            Active Hive
                                        </div>
                                    </div>
                                </div>

                                <div className="relative group/menu">
                                    <button className="p-2 text-zinc-600 hover:text-white transition-colors">
                                        <MoreVertical size={16} />
                                    </button>
                                    <div className="absolute right-0 top-full mt-2 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 hidden group-hover/menu:block z-50">
                                        <button
                                            onClick={() => onReport(squad.id, 'SQUAD')}
                                            className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:bg-white/5 flex items-center gap-2"
                                        >
                                            <ShieldAlert size={12} /> Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
