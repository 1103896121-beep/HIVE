import React from 'react';
import { useTranslation } from 'react-i18next';
import { Book, Code, Languages, Palette, Activity, Microchip, Calculator, Music, Hash } from 'lucide-react';
import { clsx } from 'clsx';
import type { Subject } from '../api/types';

const ICON_MAP: Record<string, React.ElementType> = {
    'Calculator': Calculator,
    'Code': Code,
    'Languages': Languages,
    'Palette': Palette,
    'Activity': Activity,
    'Microchip': Microchip,
    'Music': Music,
    'Book': Book,
    'Hash': Hash
};

export const SubjectPicker: React.FC<{
    onSelect: (name: string) => void;
    subjects?: Subject[];
}> = ({ onSelect, subjects }) => {
    const { t } = useTranslation();
    
    // 如果没有传入则使用默认（或者等加载完毕）
    const items = (subjects && subjects.length > 0 ? subjects : [
        { id: 1, name: 'Mathematics', key: 'mathematics', icon: 'Calculator', color_hex: '' },
        { id: 2, name: 'Coding', key: 'coding', icon: 'Code', color_hex: '' },
        { id: 3, name: 'Languages', key: 'languages', icon: 'Languages', color_hex: '' },
        { id: 4, name: 'Art', key: 'art', icon: 'Palette', color_hex: '' },
        { id: 5, name: 'Science', key: 'science', icon: 'Microchip', color_hex: '' },
        { id: 6, name: 'Music', key: 'music', icon: 'Music', color_hex: '' },
        { id: 7, name: 'Literature', key: 'literature', icon: 'Book', color_hex: '' },
        { id: 8, name: 'Others', key: 'others', icon: 'Hash', color_hex: '' },
    ]) as Subject[];

    return (
        <div className="grid grid-cols-2 gap-4">
            {items.map((cat: Subject | typeof items[0]) => {
                const Icon = ICON_MAP[cat.icon || 'Hash'] || Hash;
                return (
                    <button
                        key={cat.id}
                        onClick={() => onSelect(cat.name)}
                        className="flex flex-col items-center p-6 rounded-[24px] border transition-all active:scale-95 text-center group"
                        style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                    >
                        <div className={clsx("p-3 rounded-full mb-3 bg-black/40", cat.color_hex ? `text-[${cat.color_hex}]` : "text-amber-400")}>
                            <Icon size={24} />
                        </div>
                        <div className="text-sm font-bold text-zinc-100">
                            {t(`subjects.${(cat.key || cat.name).toLowerCase()}`, { defaultValue: cat.name })}
                        </div>
                    </button>
                );
            })}
        </div>
    );
};
