import React, { useState, useEffect } from 'react';
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
    const [nudged, setNudged] = useState<string | null>(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
    const [isFetchingProfile, setIsFetchingProfile] = useState(false);
    const [localSearchQuery, setLocalSearchQuery] = useState('');

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
        setTimeout(() => setNudged(null), 2000);
    };

    const handleSelectUser = async (userId: string) => {
        setIsFetchingProfile(true);
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
            } as any);
        } catch (error) {
            console.error("Failed to fetch profile:", error);
            onAlert("Error", "Could not load user profile.");
        } finally {
            setIsFetchingProfile(false);
        }
    };

    const handleAddBond = async (targetId: string) => {
        try {
            await socialService.createBond(userId, targetId);
            setIsSearchOpen(false);
            setSearchQuery('');
            onAlert("Success", "Bond request sent successfully!");
        } catch (error: any) {
            console.error("Add bond failed:", error);
            onAlert("Error", error.message || "Failed to send bond request.");
        }
    };

    const handleRemoveBond = async (targetId: string) => {
        try {
            await socialService.removeBond(userId, targetId);
            onAlert("Removed", "Bond connection has been removed.");
            // Ideally trigger a refresh of bonds here
        } catch (error: any) {
            onAlert("Error", "Failed to remove bond.");
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
                        <h3 className="font-bold text-white tracking-tight">Bond Pacts</h3>
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Shared Accountability</p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex -space-x-3">
                        {bonds.filter(b => b.other_user).slice(0, 3).map(bond => (
                            <div key={bond.other_user!.user_id} className="w-10 h-10 rounded-full border-2 border-[#111] bg-zinc-800 flex items-center justify-center overflow-hidden">
                                <img
                                    src={bond.other_user!.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${bond.other_user!.user_id}`}
                                    alt="avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-black" style={{ color: 'var(--accent)' }}>{bonds.length} Active Bonds</div>
                        <div className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>Connected for focus</div>
                    </div>
                </div>
            </div>

            {/* Bonds List */}
            <div>
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: 'var(--text-secondary)' }}>Your Bonds</h3>
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="flex items-center gap-1.5 text-xs font-bold hover:opacity-80 transition-opacity"
                            style={{ color: 'var(--accent)' }}
                        >
                            <UserPlus size={14} /> Link New
                        </button>
                    </div>

                    {bonds.length > 5 && (
                        <div className="relative mx-1">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search size={14} className="text-zinc-600" />
                            </div>
                            <input
                                type="text"
                                placeholder="Filter your bonds..."
                                value={localSearchQuery}
                                onChange={(e) => setLocalSearchQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-600 outline-none focus:border-[var(--accent)]/30 transition-all"
                            />
                        </div>
                    )}
                </div>

                <div className="space-y-3">
                    {bonds.length === 0 ? (
                        <div className="p-8 text-center text-zinc-600 border border-dashed border-zinc-800 rounded-3xl font-bold uppercase text-[10px] tracking-widest">
                            No Bonds established yet
                        </div>
                    ) : (
                        bonds
                            .filter(b => b.other_user)
                            .filter(b =>
                                b.other_user!.name.toLowerCase().includes(localSearchQuery.toLowerCase()) ||
                                (b.other_user!.city || '').toLowerCase().includes(localSearchQuery.toLowerCase())
                            )
                            .map((bond, index) => {
                                const otherUser = bond.other_user!;
                                const isAccepted = bond.status === 'ACCEPTED';

                                return (
                                    <div
                                        key={otherUser.user_id}
                                        className="flex items-center gap-4 p-5 rounded-[28px] border transition-all duration-500 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 hover:z-50 relative"
                                        style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            borderColor: isAccepted ? 'rgba(var(--accent-rgb), 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                            animationDelay: `${index * 50}ms`,
                                            animationFillMode: 'both'
                                        }}
                                    >
                                        <div className="relative">
                                            <button
                                                onClick={() => handleSelectUser(otherUser.user_id)}
                                                disabled={isFetchingProfile}
                                                className={clsx(
                                                    "w-14 h-14 rounded-[22px] overflow-hidden border-2 transition-all duration-700 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50",
                                                    isAccepted ? "border-[var(--accent)]" : "border-zinc-800 opacity-60"
                                                )}
                                            >
                                                <img
                                                    src={otherUser.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherUser.user_id}`}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                            {isAccepted && (
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--accent)] rounded-full border-2 border-[#111] flex items-center justify-center">
                                                    <Zap size={10} fill="black" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-bold text-white tracking-tight truncate">{otherUser.name}</span>
                                            </div>
                                            <div className="text-[10px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                                                {otherUser.city || 'Digital Space'}
                                            </div>
                                            {!isAccepted && (
                                                <div className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--accent)' }}>
                                                    {bond.status}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {isAccepted && (
                                                <button
                                                    onClick={() => handleNudge(otherUser.user_id)}
                                                    className={clsx(
                                                        "p-3 rounded-2xl transition-all active:scale-90",
                                                        nudged === otherUser.user_id
                                                            ? "text-black"
                                                            : "bg-white/5 text-zinc-400 hover:text-white"
                                                    )}
                                                    style={{ backgroundColor: nudged === otherUser.user_id ? 'var(--accent)' : undefined }}
                                                >
                                                    <Zap size={18} fill={nudged === otherUser.user_id ? 'currentColor' : 'none'} className={clsx(nudged === otherUser.user_id && "animate-bounce")} />
                                                </button>
                                            )}
                                            <div className="relative group/menu">
                                                <button className="p-2 text-zinc-600 hover:text-white transition-colors">
                                                    <MoreVertical size={16} />
                                                </button>
                                                <div className="absolute right-0 top-full mt-2 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-2 hidden group-hover/menu:block z-50">
                                                    <button
                                                        onClick={() => handleRemoveBond(otherUser.user_id)}
                                                        className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:bg-white/5 flex items-center gap-2"
                                                    >
                                                        <XCircle size={12} /> Delete
                                                    </button>
                                                    <button
                                                        onClick={() => handleBlock(otherUser.user_id)}
                                                        className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-red-500 hover:bg-white/5 flex items-center gap-2"
                                                    >
                                                        <ShieldAlert size={12} /> Block
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

            {/* User Search Modal */}
            {isSearchOpen && (
                <div className="absolute inset-0 z-[100] flex items-end justify-center px-4 pb-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full bg-zinc-900 border border-white/10 rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 flex flex-col max-h-[80%]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white tracking-tight">Form New Bond</h3>
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
                                placeholder="Search by name or email..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-[var(--accent)] transition-colors"
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto hide-scrollbar space-y-3 min-h-[150px]">
                            {isSearching ? (
                                <div className="flex items-center justify-center h-32 text-zinc-500">
                                    <Loader2 className="animate-spin mr-2" size={20} /> Searching...
                                </div>
                            ) : searchQuery.length > 0 && searchQuery.length < 2 ? (
                                <div className="flex items-center justify-center h-32 text-zinc-600 text-xs font-bold uppercase tracking-widest text-center px-4">
                                    Type at least 2 characters
                                </div>
                            ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                                <div className="flex items-center justify-center h-32 text-zinc-600 text-xs font-bold uppercase tracking-widest text-center px-4">
                                    No users found
                                </div>
                            ) : (
                                searchResults.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setSelectedUser(user)}
                                                className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 hover:scale-105 active:scale-95 transition-transform"
                                            >
                                                <img src={user.avatar_url || `https://i.pravatar.cc/150?u=${user.id}`} alt={user.name} className="w-full h-full object-cover" />
                                            </button>
                                            <div>
                                                <div className="text-sm font-bold text-white">{user.name}</div>
                                                <div className="text-[10px] text-zinc-500">{user.city || 'Digital World'}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleAddBond(user.id)}
                                            className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest text-black active:scale-95 transition-transform"
                                            style={{ backgroundColor: 'var(--accent)' }}
                                        >
                                            Add
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
                                    <img src={selectedUser.avatar_url || `https://i.pravatar.cc/150?u=${selectedUser.id}`} alt={selectedUser.name} className="w-full h-full object-cover" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-white tracking-tight mb-1">{selectedUser.name}</h2>
                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">{selectedUser.city || 'Digital Space'}</p>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
                                    <div className="text-[var(--accent)] mb-1 flex justify-center"><Zap size={16} fill="currentColor" /></div>
                                    <div className="text-lg font-black text-white leading-tight">{selectedUser.total_sparks || 0}</div>
                                    <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Sparks Earned</div>
                                </div>
                                <div className="bg-white/5 rounded-3xl p-4 border border-white/5">
                                    <div className="text-[var(--accent)] mb-1 flex justify-center"><ShieldAlert size={16} /></div>
                                    <div className="text-lg font-black text-white leading-tight">{Math.round((selectedUser.total_focus_mins || 0) / 60)}h</div>
                                    <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Focus Hours</div>
                                </div>
                            </div>

                            <div className="text-left bg-white/5 rounded-3xl p-5 border border-white/5">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Manifesto</h4>
                                <p className="text-sm text-zinc-300 leading-relaxed italic">
                                    "{selectedUser.bio || 'This wanderer has not written a bio yet. Pure focus, no distractions.'}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
