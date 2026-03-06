import React from 'react';
import { Book, Code, Languages, Palette, Activity, Microchip, Calculator, Music } from 'lucide-react';
import { clsx } from 'clsx';

const CATEGORIES = [
    { id: 'math', name: 'Mathematics', icon: Calculator, color: 'text-blue-400' },
    { id: 'code', name: 'Coding', icon: Code, color: 'text-emerald-400' },
    { id: 'lang', name: 'Languages', icon: Languages, color: 'text-amber-400' },
    { id: 'art', name: 'Art', icon: Palette, color: 'text-pink-400' },
    { id: 'bio', name: 'Biology', icon: Activity, color: 'text-red-400' },
    { id: 'tech', name: 'Technology', icon: Microchip, color: 'text-cyan-400' },
    { id: 'mus', name: 'Music', icon: Music, color: 'text-purple-400' },
    { id: 'lit', name: 'Literature', icon: Book, color: 'text-indigo-400' },
];

export const SubjectPicker: React.FC<{ onSelect: (name: string) => void }> = ({ onSelect }) => {
    return (
        <div className="grid grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => onSelect(cat.name)}
                    className="flex flex-col items-center p-6 rounded-[24px] border transition-all active:scale-95 text-center group"
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}

                >
                    <div className={clsx("p-3 rounded-full mb-3 bg-black/40", cat.color)}>
                        <cat.icon size={24} />
                    </div>
                    <div className="text-sm font-bold text-zinc-100">{cat.name}</div>
                </button>
            ))}
        </div>
    );
};
