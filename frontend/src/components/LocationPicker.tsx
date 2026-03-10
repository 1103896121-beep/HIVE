import React, { useState, useMemo } from 'react';
import { ChevronRight, Globe, Search, Navigation, ArrowLeft } from 'lucide-react';
import { LOCATION_DATA } from '../data/locations';

export const LocationPicker: React.FC<{ onSelect: (location: string) => void }> = ({ onSelect }) => {
    const [path, setPath] = useState<{ id: string, name: string }[]>([{ id: 'Global', name: 'Global' }]);
    const [searchQuery, setSearchQuery] = useState('');

    const [loading, setLoading] = useState(false);

    const handleLocateMe = async () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                // Using Nominatim for reverse geocoding (no API key required for small usage)
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
                const data = await response.json();

                // Try to get city, town, or village
                const city = data.address.city || data.address.town || data.address.village || data.address.state || data.address.country;
                if (city) {
                    onSelect(city);
                } else {
                    onSelect(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
                }
            } catch (error) {
                console.error('Reverse geocoding failed:', error);
                onSelect(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
            } finally {
                setLoading(false);
            }
        }, (error) => {
            console.error('Geolocation error:', error);
            alert('Unable to retrieve your location');
            setLoading(false);
        });
    };

    const currentLevel = LOCATION_DATA.find(d => d.id === path[path.length - 1].id);
    const children = currentLevel?.children || [];

    const filteredResults = useMemo(() => {
        if (!searchQuery.trim()) return [];

        const normalize = (str: string) =>
            str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const query = normalize(searchQuery);

        return LOCATION_DATA.filter(d => {
            const normalizedName = normalize(d.name);
            const normalizedParent = d.parent ? normalize(d.parent) : '';

            const nameMatch = normalizedName.includes(query);
            const parentMatch = normalizedParent.includes(query);
            return (d.type === 'city' || d.type === 'province' || d.type === 'country') && (nameMatch || parentMatch);
        })
            .sort((a, b) => {
                const normalizedA = normalize(a.name);
                const normalizedB = normalize(b.name);

                const aExact = normalizedA === query;
                const bExact = normalizedB === query;
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                const aStarts = normalizedA.startsWith(query);
                const bStarts = normalizedB.startsWith(query);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;

                return 0;
            })
            .slice(0, 40);
    }, [searchQuery]);

    const handleSelect = (itemId: string, itemName: string) => {
        const itemData = LOCATION_DATA.find(d => d.id === itemId);
        if (itemData && itemData.children.length > 0) {
            setPath([...path, { id: itemId, name: itemName }]);
            setSearchQuery('');
        } else {
            onSelect(itemName);
        }
    };

    const goBack = () => {
        if (path.length > 1) {
            setPath(path.slice(0, -1));
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="relative mb-6">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Search size={18} />
                </div>
                <input
                    type="text"
                    placeholder="Search city, province or country..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 transition-all font-medium"
                />
            </div>

            {searchQuery ? (
                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {filteredResults.length > 0 ? (
                        filteredResults.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleSelect(item.id, item.name)}
                                className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                            >
                                <div className="flex flex-col items-start translate-x-0 group-hover:translate-x-1 transition-transform">
                                    <span className="font-bold text-zinc-100">{item.name}</span>
                                    {item.parent && <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{item.parent}</span>}
                                </div>
                                <div className="text-zinc-600 group-hover:text-[#F5A623] transition-colors">
                                    {item.children.length > 0 ? <ChevronRight size={18} /> : <div className="w-2 h-2 rounded-full bg-[#F5A623]/30" />}
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="py-12 text-center text-zinc-500 italic">No matches found</div>
                    )}
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3 mb-4">
                        {path.length > 1 && (
                            <button onClick={goBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                            {path.map((p, i) => (
                                <React.Fragment key={p.id}>
                                    <button
                                        onClick={() => setPath(path.slice(0, i + 1))}
                                        className={`text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors ${i === path.length - 1 ? 'text-[#F5A623]' : 'text-zinc-600 hover:text-zinc-400'}`}
                                    >
                                        {p.name}
                                    </button>
                                    {i < path.length - 1 && <span className="text-zinc-800 text-[10px]">/</span>}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {children.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleSelect(item.id, item.name)}
                                className="w-full flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-[0.98] transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-black/40 text-zinc-500 group-hover:text-[#F5A623] transition-colors">
                                        <Globe size={18} strokeWidth={2.5} />
                                    </div>
                                    <span className="font-bold text-zinc-200 group-hover:text-white transition-colors text-sm">{item.name}</span>
                                </div>
                                <ChevronRight size={18} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                            </button>
                        ))}

                        {path.length === 1 && (
                            <button
                                onClick={handleLocateMe}
                                disabled={loading}
                                className="w-full flex items-center gap-4 p-5 rounded-2xl bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] hover:bg-[#F5A623]/20 disabled:opacity-50 transition-all mt-4 group"
                            >
                                <div className="p-2.5 rounded-xl bg-[#F5A623]/10">
                                    <Navigation size={18} strokeWidth={2.5} className={loading ? "animate-pulse" : ""} />
                                </div>
                                <span className="font-black text-xs uppercase tracking-widest">
                                    {loading ? 'Locating...' : 'Locate Me (Nearby Hives within 100km)'}
                                </span>
                            </button>
                        )}
                    </div>
                </>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}} />
        </div>
    );
};
