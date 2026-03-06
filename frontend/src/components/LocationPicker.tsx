import React, { useState } from 'react';
import { ChevronRight, Globe, MapPin, Navigation } from 'lucide-react';

const DATA = [
    { name: 'Global', types: 'continent', children: ['Asia', 'Europe', 'North America', 'South America'] },
    { name: 'Asia', types: 'country', children: ['China', 'Japan', 'Korea', 'Thailand'] },
    { name: 'China', types: 'city', children: ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Hangzhou'] },
    { name: 'Beijing', types: 'city', children: [] },
];

export const LocationPicker: React.FC<{ onSelect: (location: string) => void }> = ({ onSelect }) => {
    const [path, setPath] = useState(['Global']);

    const currentLevel = DATA.find(d => d.name === path[path.length - 1]);
    const children = currentLevel?.children || [];

    const handleSelect = (item: string) => {
        const itemData = DATA.find(d => d.name === item);
        if (itemData && itemData.children.length > 0) {
            setPath([...path, item]);
        } else {
            onSelect(item);
        }
    };

    return (
        <div className="space-y-4">
            {/* Breadcrumb path */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {path.map((p, i) => (
                    <React.Fragment key={p}>
                        <button
                            onClick={() => setPath(path.slice(0, i + 1))}
                            className="text-sm font-medium text-zinc-400 whitespace-nowrap hover:text-white"
                        >
                            {p}
                        </button>
                        {i < path.length - 1 && <ChevronRight size={14} className="text-zinc-700 flex-shrink-0" />}
                    </React.Fragment>
                ))}
            </div>

            {/* List */}
            <div className="space-y-2">
                {children.length > 0 ? (
                    children.map((item) => (
                        <button
                            key={item}
                            onClick={() => handleSelect(item)}
                            className="w-full flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-xl bg-black/40 text-zinc-400">
                                    <Globe size={18} />
                                </div>
                                <span className="font-semibold text-zinc-100">{item}</span>
                            </div>
                            <ChevronRight size={18} className="text-zinc-600" />
                        </button>
                    ))
                ) : (
                    <div className="py-12 text-center text-zinc-500 italic">No more sub-regions</div>
                )}
            </div>

            {/* Near Me Shortcut */}
            {path.length === 1 && (
                <button className="w-full flex items-center gap-4 p-5 rounded-2xl bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623] hover:bg-[#F5A623]/20 transition-all mt-4">
                    <Navigation size={18} />
                    <span className="font-bold">Locate Me (Nearby Hives)</span>
                </button>
            )}
        </div>
    );
};
