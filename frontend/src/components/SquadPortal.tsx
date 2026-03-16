import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, ShieldCheck, DoorOpen, Trash2, UserPlus, XCircle } from 'lucide-react';
import type { Squad, BondEnriched } from '../api/types';
import { socialService, userService } from '../api';
import { validateContent } from '../utils/validation';

interface SquadPortalProps {
    squads: Squad[];
    bonds: BondEnriched[];
    userId: string;
    onCreate: (name: string) => Promise<void>;
    onLeave: (squadId: string) => Promise<void>;
    onDisband: (squadId: string) => Promise<void>;
    onAlert: (title: string, message: string) => void;
}

export const SquadPortal: React.FC<SquadPortalProps> = ({ squads, bonds, userId, onCreate, onLeave, onDisband, onAlert }) => {
    const { t } = useTranslation();
    const [newSquadName, setNewSquadName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Invite Modal State
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [friends, setFriends] = useState<{ id: string, name: string, avatar?: string }[]>([]);
    const [isLoadingFriends, setIsLoadingFriends] = useState(false);

    // Enforce 1-squad rule visually
    const currentSquad = squads.length > 0 ? squads[0] : null;

    useEffect(() => {
        if (isInviteOpen && currentSquad) {
            loadFriends();
        }
    }, [isInviteOpen, currentSquad]);

    const loadFriends = async () => {
        setIsLoadingFriends(true);
        try {
            // Find all accepted bonds
            const acceptedBonds = bonds.filter(b => b.status === 'ACCEPTED');
            const friendIds = acceptedBonds.map(b => b.user_id_1 === userId ? b.user_id_2 : b.user_id_1);

            // Fetch basic profile info for friends
            // Note: In a real app we might have a dedicated batch endpoint
            const friendProfiles = await Promise.all(
                friendIds.map(async (id) => {
                    try {
                        const profile = await userService.getProfile(id);
                        return { id, name: profile.name, avatar: profile.avatar_url };
                    } catch (e) {
                        return { id, name: t('common.member') + ` ${id.slice(0, 4)}`, avatar: undefined };
                    }
                })
            );
            setFriends(friendProfiles);
        } catch (error) {
            console.error("Failed to load friends", error);
        } finally {
            setIsLoadingFriends(false);
        }
    };

    const handleInvite = async (friendId: string) => {
        if (!currentSquad) return;
        try {
            await socialService.inviteToSquad(userId, friendId, currentSquad.id);
            onAlert(t('common.success'), t('squad.invite_success', "Invitation sent successfully!"));
        } catch (error: unknown) {
            onAlert(t('common.error'), (error as Error).message || t('error.invite_failed', "Failed to invite friend."));
        }
    };

    return (
        <div className="space-y-8">
            {!currentSquad ? (
                // User is not in a squad
                <div className="flex flex-col gap-4">
                    {isCreating ? (
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                            <input
                                placeholder={t('squad.hive_name')}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:border-[var(--accent)]"
                                value={newSquadName}
                                onChange={e => setNewSquadName(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const validation = validateContent(newSquadName, 'squadName');
                                        if (!validation.isValid) {
                                            onAlert(t('common.error'), t(validation.errorKey as Parameters<typeof t>[0]));
                                            return;
                                        }
                                        onCreate(newSquadName);
                                        setIsCreating(false);
                                    }}
                                    className="flex-1 py-2 rounded-xl font-bold uppercase text-[10px]"
                                    style={{ backgroundColor: 'var(--accent)', color: 'black' }}
                                >{t('common.confirm')}</button>
                                <button
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-2 rounded-xl border border-white/10 text-zinc-400 font-bold uppercase text-[10px]"
                                >{t('common.cancel')}</button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            <button
                                onClick={() => setIsCreating(true)}
                                className="flex flex-col items-center justify-center p-8 rounded-[32px] text-black hover:scale-[1.02] transition-transform active:scale-95 shadow-xl"
                                style={{ backgroundColor: 'var(--accent)', boxShadow: '0 10px 30px rgba(var(--accent-rgb), 0.2)' }}
                            >
                                <Plus size={32} strokeWidth={3} />
                                <span className="mt-2 text-center font-bold uppercase tracking-tighter leading-tight">{t('squad.create_new')}</span>
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                // User is in a squad
                <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] mb-4 px-1" style={{ color: 'var(--text-secondary)' }}>{t('squad.active_hive')}</h3>
                    <div className="w-full flex items-center justify-between p-5 rounded-3xl border transition-all text-left bg-white/5 border-white/10">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg text-white tracking-tight">{currentSquad.name}</span>
                            </div>
                            <div className="flex flex-col gap-2 mt-3">
                                <div className="flex items-center justify-between gap-1 text-[10px] text-zinc-400 font-bold uppercase">
                                    <div className="flex items-center gap-1 text-[var(--accent)]">
                                        <ShieldCheck size={12} />
                                        {currentSquad.created_by === userId ? t('common.admin') : t('common.member')}
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-2">
                                    {currentSquad.created_by === userId ? (
                                        <>
                                            <button
                                                onClick={() => setIsInviteOpen(true)}
                                                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-black active:scale-95 transition-all text-[10px] font-bold uppercase tracking-widest shadow-lg"
                                                style={{ backgroundColor: 'var(--accent)', boxShadow: '0 4px 15px rgba(var(--accent-rgb), 0.2)' }}
                                            >
                                                <UserPlus size={12} /> {t('squad.invite')}
                                            </button>
                                            <button
                                                onClick={() => onDisband(currentSquad.id)}
                                                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 active:scale-95 transition-all text-[10px] font-bold uppercase tracking-widest"
                                            >
                                                <Trash2 size={12} /> {t('squad.disband')}
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => onLeave(currentSquad.id)}
                                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10 active:scale-95 transition-all text-[10px] font-bold uppercase tracking-widest"
                                        >
                                            <DoorOpen size={12} /> {t('squad.leave')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invite Friends Modal */}
            {isInviteOpen && currentSquad && (
                <div className="absolute inset-0 z-[100] flex items-end justify-center px-4 pb-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full bg-zinc-900 border border-white/10 rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[80%]">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black text-white tracking-tight">{t('squad.invite_friends')}</h3>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{t('squad.invite_friends_subtitle')}</p>
                            </div>
                            <button onClick={() => setIsInviteOpen(false)} className="p-2 bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3 min-h-[150px]">
                            {isLoadingFriends ? (
                                <div className="flex items-center justify-center h-32 text-zinc-500">
                                    {t('common.loading')}
                                </div>
                            ) : friends.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                                        <ShieldCheck size={20} className="text-zinc-600" />
                                    </div>
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">{t('squad.no_bonds_title')}</p>
                                    <p className="text-[10px] text-zinc-600 leading-relaxed">{t('squad.no_bonds_desc')}</p>
                                </div>
                            ) : (
                                friends.map(friend => (
                                    <div key={friend.id} className="group flex items-center justify-between p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/[0.08] transition-all duration-300">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-zinc-800 border-2 border-white/5 group-hover:border-[var(--accent)]/30 transition-all">
                                                    <img src={friend.avatar || `https://i.pravatar.cc/150?u=${friend.id}`} alt={friend.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-zinc-900 rounded-full" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-white tracking-tight">{friend.name}</div>
                                                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{t('bonds.active_bond_tag')}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleInvite(friend.id)}
                                            className="px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-black active:scale-90 transition-all shadow-lg"
                                            style={{ backgroundColor: 'var(--accent)', boxShadow: '0 4px 15px rgba(var(--accent-rgb), 0.2)' }}
                                        >
                                            {t('squad.invite')}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
