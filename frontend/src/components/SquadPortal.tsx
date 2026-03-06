import React from 'react';
import { Users, Plus, Star, ShieldCheck } from 'lucide-react';

const SQUADS = [
    { id: 1, name: 'Deep Work Elite', members: 42, activity: 'High', tags: ['Hardcore', 'No Mic'] },
    { id: 2, name: 'Late Night Library', members: 128, activity: 'Medium', tags: ['Europe', 'Quiet'] },
    { id: 3, name: 'Code & Coffee', members: 15, activity: 'Live', tags: ['Project', 'Web3'] },
    { id: 4, name: 'Morning Birds', members: 89, activity: 'High', tags: ['Global', 'Early'] },
];

export const SquadPortal: React.FC<{ onJoin: (name: string) => void }> = ({ onJoin }) => {
    return (
        <div className="space-y-8">
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    className="flex flex-col items-center justify-center p-6 rounded-3xl text-black hover:scale-[1.02] transition-transform active:scale-95 shadow-xl transition-colors duration-500"
                    style={{ backgroundColor: 'var(--accent)', boxShadow: '0 10px 30px rgba(var(--accent-rgb), 0.2)' }}
                >
                    <Plus size={28} strokeWidth={3} />
                    <span className="mt-2 font-bold uppercase tracking-tighter">Create Hive</span>
                </button>

                <button className="flex flex-col items-center justify-center p-6 rounded-3xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors active:scale-95">
                    <Star size={28} />
                    <span className="mt-2 font-bold uppercase tracking-tighter">My Favorites</span>
                </button>
            </div>

            {/* Trending Squads */}
            <div>
                <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-4 px-1" style={{ color: 'var(--text-secondary)' }}>Trending Hives</h3>
                <div className="space-y-3">

                    {SQUADS.map((squad) => (
                        <button
                            key={squad.id}
                            onClick={() => onJoin(squad.name)}
                            className="w-full flex items-center justify-between p-5 rounded-3xl border transition-all text-left"
                            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                        >

                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-lg text-white tracking-tight">{squad.name}</span>
                                    {squad.activity === 'Live' && (
                                        <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest">Live</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase">
                                        <Users size={12} />
                                        {squad.members} Members
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase">
                                        <ShieldCheck size={12} />
                                        {squad.activity} Activity
                                    </div>
                                </div>
                            </div>
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-[#111] bg-zinc-800" />
                                ))}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
