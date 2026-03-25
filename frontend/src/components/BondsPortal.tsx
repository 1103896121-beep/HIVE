import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Zap, ShieldAlert, MoreVertical, XCircle, Search, Loader2 } from 'lucide-react';
import type { BondEnriched, UserSearchResult } from '../api/types';
import { userService, socialService } from '../api';
import { clsx } from 'clsx';

interface BondsPortalProps {
    bonds: BondEnriched[];
    userId: string;
    onNudge: (targetId: string) => void;
    onBlock: (targetId: string) => void;
    onAlert: (title: string, message: string) => void;
}

export const BondsPortal: React.FC<BondsPortalProps> = ({ bonds, userId, onNudge, onBlock, onAlert }) => {
    const { t } = useTranslation();
    const [nudged, setNudged] = useState<string | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);

    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [actionUser, setActionUser] = useState<BondEnriched | null>(null);

    // Mock geolocation for dev - ideally this would come from the browser API or App.tsx
    const mockLocation = { lat: 39.9042, lon: 116.4074 }; // Beijing Center

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                try {
                    const results = await userService.searchUsers(searchQuery, mockLocation.lat, mockLocation.lon);
                    // Filter self and existing
                    const existingBondIds = new Set(
                        bonds.flatMap(b => [b.user_id_1, b.user_id_2])
                    );
                    const filtered = results.filter(u =>
                        u.id !== userId && !existingBondIds.has(u.id)
                    );
                    setSearchResults(filtered);
                } catch (error) {
                    console.error("Search failed:", error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, userId, bonds]);

    const handleNudge = (targetId: string) => {
        setNudged(targetId);
        onNudge(targetId);
        setTimeout(() => setNudged(null), 300);
    };

    const handleSelectUser = async (userId: string) => {
        try {
            const profile = await userService.getProfile(userId);
            // Map Profile to UserSearchResult for the modal
            setSelectedUser({
                id: profile.user_id,
                name: profile.name,
                email: '', // Not provided by getProfile for privacy
                avatar_url: profile.avatar_url,
                city: profile.city,
                bio: profile.bio,
                total_focus_mins: profile.total_focus_mins,
                total_sparks: profile.total_sparks
            } as UserSearchResult);
        } catch (error) {
            console.error("Failed to fetch profile:", error);
            onAlert(t('common.error'), t('error.profile_load_failed', 'Could not load user profile.'));
        } finally {
        }
    };

    const handleAddBond = async (targetId: string) => {
        try {
            await socialService.createBond(userId, targetId);
            setIsSearchOpen(false);
            setSearchQuery('');
            onAlert(t('common.success'), t('bonds.request_sent'));
        } catch (error: unknown) {
            console.error("Add bond failed:", error);
            onAlert(t('common.error'), (error as Error).message || t('error.request_bond_failed', "Failed to send bond request."));
        }
    };

    const handleRemoveBond = async (targetId: string) => {
        try {
            await socialService.removeBond(userId, targetId);
            onAlert(t('common.remove'), t('bonds.removed_success'));
            // Ideally trigger a refresh of bonds here
        } catch (error: unknown) {
            onAlert(t('common.error'), t('error.remove_bond_failed', "Failed to remove bond."));
        }
    };

    const handleBlock = async (targetId: string) => {
        onBlock(targetId);
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
                        <h3 className="font-bold text-white tracking-tight">{t('bonds.pacts')}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('bonds.accountability')}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex -space-x-3">
                        {bonds.filter(b => b.other_user).slice(0, 3).map(bond => (
                            <div key={bond.other_user!.user_id} className="w-10 h-10 rounded-full border-2 border-[#111] bg-zinc-800 flex items-center justify-center overflow-hidden">
                                <img
                                    src={bond.other_user!.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bond.other_user!.user_id}`}
                                    onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${bond.other_user!.user_id}`; }}
                                    alt="avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-black" style={{ color: 'var(--accent)' }}>{t('bonds.active_count', { count: bonds.filter(b => b.status === 'ACCEPTED').length })}</div>
                        <div className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>{t('bonds.connected_desc')}</div>
                    </div>
                </div>
            </div>

            {/* Bonds List */}
            <div>
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: 'var(--text-secondary)' }}>{t('bonds.your_bonds')}</h3>
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-bold hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--accent)' }}
                        >
                            <UserPlus size={14} /> {t('bonds.link_new')}
                        </button>
                    </div>

                    {bonds.length > 5 && (
                        <div className="relative mx-1">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search size={14} className="text-zinc-600" />
                            </div>
                            <input
                                type="text"
                                placeholder={t('bonds.filter_placeholder')}
                                value={localSearchQuery}
                                onChange={(e) => setLocalSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-600 outline-none focus:border-[var(--accent)]/30 transition-all"
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    {/* Received Requests Section */}
                    {bonds.some(b => b.status === 'PENDING' && b.requester_id !== userId) && (
                        <div className="space-y-3">
                            <h4 className="px-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#F5A623]">{t('bonds.received_requests', 'Received Requests')}</h4>
                            {bonds
                                .filter(b => b.status === 'PENDING' && b.requester_id !== userId && b.other_user)
                                .map(bond => (
                                    <div key={bond.other_user!.user_id} className="flex items-center gap-4 p-4 rounded-3xl bg-[#F5A623]/5 border border-[#F5A623]/20">
                                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                                            <img 
                                                src={bond.other_user!.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bond.other_user!.user_id}`} 
                                                onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${bond.other_user!.user_id}`; }}
                                                className="w-full h-full object-cover" 
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-white truncate">{bond.other_user!.name}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        await socialService.updateBondStatus(userId, bond.other_user!.user_id, 'ACCEPTED');
                                                        onAlert(t('common.success'), t('bonds.accepted_success', 'Bond confirmed!'));
                                                        window.location.reload(); // Quick refresh for now
                                                    } catch { onAlert('Error', 'Failed to accept.'); }
                                                }}
                                                className="px-3 py-1.5 bg-[var(--accent)] rounded-lg text-black text-[9px] font-black uppercase tracking-widest"
                                            >
                                                {t('common.accept', 'Accept')}
                                            </button>
                                            <button 
                                                onClick={() => handleRemoveBond(bond.other_user!.user_id)}
                                                className="px-3 py-1.5 bg-white/5 rounded-lg text-zinc-400 text-[9px] font-black uppercase tracking-widest"
                                            >
                                                {t('common.ignore', 'Ignore')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* Active Bonds Section */}
                    <div className="space-y-3">
                        <h4 className="px-1 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{t('bonds.established_bonds', 'Established')}</h4>
                        {bonds.filter(b => b.status === 'ACCEPTED').length === 0 ? (
                            <div className="p-8 text-center text-zinc-600 border border-dashed border-zinc-800 rounded-3xl font-bold uppercase text-[10px] tracking-widest">
                                {t('bonds.no_bonds')}
                            </div>
                        ) : (
                            bonds
                                .filter(b => b.status === 'ACCEPTED' && b.other_user)
                                .map((bond) => {
                                    const otherUser = bond.other_user!;
                                    return (
                                        <div
                                            key={otherUser.user_id}
                                            className="flex items-center gap-4 p-5 rounded-[28px] border bg-white/[0.03] border-[var(--accent)]/20 transition-all duration-500"
                                        >
                                            <div className="relative">
                                                <button onClick={() => handleSelectUser(otherUser.user_id)} className="w-14 h-14 rounded-[22px] overflow-hidden border-2 border-[var(--accent)] transition-all">
                                                    <img 
                                                        src={otherUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.user_id}`} 
                                                        onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.user_id}`; }}
                                                        className="w-full h-full object-cover" 
                                                    />
                                                </button>
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--accent)] rounded-full border-2 border-[#111] flex items-center justify-center">
                                                    <Zap size={10} fill="black" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-bold text-white tracking-tight truncate block">{otherUser.name}</span>
                                                <div className="text-[10px] font-bold text-zinc-500">{otherUser.city || t('common.digital_space')}</div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleNudge(otherUser.user_id)} className={clsx("p-3 rounded-2xl transition-all", nudged === otherUser.user_id ? "bg-[var(--accent)] text-black" : "bg-white/5 text-zinc-400")}>
                                                    <Zap size={18} fill={nudged === otherUser.user_id ? 'currentColor' : 'none'} className={clsx(nudged === otherUser.user_id && "animate-bounce")} />
                                                </button>
                                                <button onClick={() => setActionUser(bond)} className="p-3 bg-white/5 rounded-2xl text-zinc-600"><MoreVertical size={16} /></button>
                                            </div>
                                        </div>
                                    );
                                })
                        )}
                    </div>

                    {/* Sent Requests Section */}
                    {bonds.some(b => b.status === 'PENDING' && b.requester_id === userId) && (
                        <div className="space-y-3 opacity-60">
                            <h4 className="px-1 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{t('bonds.sent_requests', 'Sent Requests')}</h4>
                            {bonds
                                .filter(b => b.status === 'PENDING' && b.requester_id === userId && b.other_user)
                                .map(bond => (
                                    <div key={bond.other_user!.user_id} className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5">
                                        <div className="w-10 h-10 rounded-full overflow-hidden grayscale">
                                            <img 
                                                src={bond.other_user!.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bond.other_user!.user_id}`} 
                                                onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${bond.other_user!.user_id}`; }}
                                                className="w-full h-full object-cover" 
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-zinc-400 truncate">{bond.other_user!.name}</div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveBond(bond.other_user!.user_id)}
                                            className="px-3 py-1.5 bg-white/5 rounded-lg text-zinc-500 text-[9px] font-black uppercase tracking-widest"
                                        >
                                            {t('common.cancel', 'Cancel')}
                                        </button>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>

            {/* iOS Style Action Sheet */}
            {actionUser && (
                <div className="fixed inset-0 z-[200] flex items-end justify-center px-6 pb-12 transition-all duration-500">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-md animate-in fade-in duration-500"
                        onClick={() => setActionUser(null)}
                    />
                    <div className="w-full max-w-[280px] bg-[#1a1a1a]/80 backdrop-blur-2xl border border-white/10 rounded-[32px] overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-12 duration-700 relative z-10">
                        <div className="pt-6 pb-2 text-center">
                            <h3 className="text-xs font-black text-white/90 uppercase tracking-[0.2em]">{actionUser.other_user?.name}</h3>
                        </div>

                        <div className="p-3 space-y-1.5">
                            <button
                                onClick={() => {
                                    handleRemoveBond(actionUser.other_user!.user_id);
                                    setActionUser(null);
                                }}
                                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all group"
                            >
                                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20 transition-colors">
                                    <XCircle size={16} />
                                </div>
                                <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">{t('common.remove')}</span>
                            </button>

                            <button
                                onClick={() => {
                                    handleBlock(actionUser.other_user!.user_id);
                                    setActionUser(null);
                                }}
                                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 active:scale-95 transition-all group"
                            >
                                <div className="p-2 rounded-xl bg-red-500/10 text-red-500 group-hover:bg-red-500/20 transition-colors">
                                    <ShieldAlert size={16} />
                                </div>
                                <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">{t('common.block')}</span>
                            </button>
                        </div>

                        <div className="p-3 pt-0">
                            <button
                                onClick={() => setActionUser(null)}
                                className="w-full py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-500 font-bold text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Search Modal */}
            {isSearchOpen && (
                <div className="absolute inset-0 z-[100] flex items-end justify-center px-4 pb-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full bg-zinc-900 border border-white/10 rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[80%]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white tracking-tight">{t('bonds.form_new_title')}</h3>
                            <button onClick={() => setIsSearchOpen(false)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="relative mb-6 flex-shrink-0">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search size={18} className="text-zinc-500" />
                            </div>
                            <input
                                type="text"
                                placeholder={t('bonds.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-[var(--accent)] transition-colors"
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3 min-h-[150px]">
                            {isSearching ? (
                                <div className="flex items-center justify-center h-32 text-zinc-500">
                                    <Loader2 className="animate-spin mr-2" size={20} /> {t('common.searching')}
                                </div>
                            ) : searchQuery.length > 0 && searchQuery.length < 2 ? (
                                <div className="flex items-center justify-center h-32 text-zinc-600 text-xs font-bold uppercase tracking-widest text-center px-4">
                                    {t('bonds.type_2_chars')}
                                </div>
                            ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                                <div className="flex items-center justify-center h-32 text-zinc-600 text-xs font-bold uppercase tracking-widest text-center px-4">
                                    {t('bonds.no_users_found')}
                                </div>
                            ) : (
                                searchResults.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setSelectedUser(user)}
                                                className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 hover:scale-105 active:scale-95 transition-transform"
                                            >
                                                <img 
                                                    src={user.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`} 
                                                    onError={(e) => { e.currentTarget.src = `https://i.pravatar.cc/150?u=${user.id}`; }}
                                                    alt={user.name} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            </button>
                                            <div>
                                                <div className="text-sm font-bold text-white">{user.name}</div>
                                                <div className="text-[10px] text-zinc-500">{user.city || t('common.digital_space')}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddBond(user.id)}
                                            className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-black active:scale-95 transition-transform"
                                            style={{ backgroundColor: 'var(--accent)' }}
                                        >
                                            {t('common.add')}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Detail Modal */}
            {selectedUser && (
                <div className="absolute inset-0 z-[150] flex items-center justify-center px-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Header Image Area */}
                        <div className="h-32 bg-gradient-to-br from-[var(--accent)] to-black relative">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="absolute top-6 right-6 p-2 bg-black/20 backdrop-blur-md rounded-full text-white/70 hover:text-white transition-colors"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        {/* Profile Info */}
                        <div className="px-8 pb-10 -mt-16 text-center relative z-10">
                            <div className="inline-block p-1.5 bg-zinc-900 rounded-[32px] mb-4 shadow-2xl">
                                <div className="w-28 h-28 rounded-[28px] overflow-hidden border-4 border-zinc-800 bg-zinc-800">
                                    <img 
                                        src={selectedUser.avatar_url || `https://i.pravatar.cc/150?u=${selectedUser.id}`} 
                                        onError={(e) => { e.currentTarget.src = `https://i.pravatar.cc/150?u=${selectedUser.id}`; }}
                                        alt={selectedUser.name} 
                                        className="w-full h-full object-cover" 
                                    />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-white tracking-tight mb-1">{selectedUser.name}</h2>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">{selectedUser.city || t('common.digital_space')}</p>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
                                    <div className="text-[var(--accent)] mb-1 flex justify-center"><Zap size={16} fill="currentColor" /></div>
                                    <div className="text-lg font-black text-white leading-tight">{selectedUser.total_sparks || 0}</div>
                                    <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{t('profile.sparks_earned')}</div>
                                </div>
                                <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
                                    <div className="text-[var(--accent)] mb-1 flex justify-center"><ShieldAlert size={16} /></div>
                                    <div className="text-lg font-black text-white leading-tight">{Math.round((selectedUser.total_focus_mins || 0) / 60)}h</div>
                                    <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{t('profile.focus_hours')}</div>
                                </div>
                            </div>

                            <div className="text-left bg-white/5 rounded-3xl p-5 border border-white/5">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">{t('profile.manifesto')}</h4>
                                <p className="text-sm text-zinc-300 leading-relaxed italic">
                                    "{selectedUser.bio || t('profile.no_bio')}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
