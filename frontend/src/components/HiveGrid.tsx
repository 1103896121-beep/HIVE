import React from 'react';
import { Users, UserPlus, ShieldCheck, Heart } from 'lucide-react';
import clsx from 'clsx';
import type { HiveMatchTile } from '../api/types';

interface HiveGridProps {
    tiles: HiveMatchTile[];
    onUserClick: (user: HiveMatchTile) => void;
}

export const HiveGrid: React.FC<HiveGridProps> = React.memo(({ tiles, onUserClick }) => {
    // Hexagonal grid staggered layout logic
    // ...
    return (
        <div className="grid grid-cols-3 gap-x-1 gap-y-0 w-fit relative z-10 transition-transform duration-700">
            {tiles.slice(0, 9).map((member, index) => {
                // ...
                return (
                    <div key={member.user_id} className={clsx("flex flex-col items-center", index % 3 === 1 ? 'translate-y-[34px]' : '')}>
                        {/* Tile Content */}
                        <div
                            onClick={() => onUserClick(member)}
                            className={clsx(
                                "w-[66px] h-[76px] hex-clip relative group transition-all duration-500 cursor-pointer active:scale-95",
                                member.status === 'focus' ? "bg-[#F5A623] breathing" : member.status === 'offline' ? "bg-zinc-900 border border-zinc-800 opacity-40" : "bg-zinc-800"
                            )}
                        >
                            <div className="absolute inset-[2px] hex-clip bg-[#111] overflow-hidden">
                                {member.status !== 'offline' ? (
                                    <img 
                                        src={member.avatar_url || `https://i.pravatar.cc/150?u=${member.user_id}`} 
                                        alt={member.name} 
                                        className={clsx("w-full h-full object-cover transition-opacity", member.status !== 'focus' && "opacity-50 grayscale")} 
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-700">
                                        <Users size={18} />
                                    </div>
                                )}
                                
                                {member.status === 'focus' && (
                                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(245, 166, 35, 0.4), transparent)' }}></div>
                                )}

                                <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                                    {member.is_squad && (
                                        <ShieldCheck size={10} className="text-[#F5A623] drop-shadow-lg" />
                                    )}
                                    {member.is_bond && (
                                        <Heart size={10} className="text-pink-500 fill-current drop-shadow-lg" />
                                    )}
                                    {member.status !== 'offline' && !member.is_bond && !member.is_squad && (
                                        <UserPlus size={10} className="text-[#F5A623] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-1 text-center w-[70px]">
                            <div className="text-[10px] font-bold text-zinc-300 truncate px-1">{member.name}</div>
                            <div className={clsx(
                                "text-[7px] font-black uppercase tracking-widest truncate px-1", 
                                member.status === 'focus' ? "text-[#F5A623]" : (member.status === 'break' ? "text-cyan-400" : "text-zinc-600")
                            )}>
                                {member.status === 'focus' ? (member.subject || 'Focus') : (member.status === 'offline' ? 'OFF' : 'BREAK')}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
});
