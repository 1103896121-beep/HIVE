import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface SheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ isOpen, onClose, title, children }) => {
    const [mounted, setMounted] = useState(isOpen);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (isOpen) {
            setMounted(true);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            timer = setTimeout(() => setMounted(false), 300);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isOpen]);

    // Pre-mount CSS hide to allow transition without conditional structural mounting
    const displayClass = mounted ? "flex" : "hidden";

    return (
        <div className={cn(
            "fixed inset-0 z-[100] flex-col justify-end transition-opacity duration-300",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
            displayClass
        )}>
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Content Container (Simulating iOS Half-Screen Sheet) */}
            <div className={cn(
                "relative w-full max-w-[500px] mx-auto bg-[#111] border-t border-white/5 rounded-t-[32px] transition-transform duration-300 ease-out flex flex-col",
                isOpen ? "translate-y-0" : "translate-y-full"
            )}
                style={{ height: '70vh' }}>

                {/* Pull Handle */}
                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-3" />

                {/* Header */}
                <div className="p-6 flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-white/5 text-zinc-400 hover:bg-white/10"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 pb-12">
                    {children}
                </div>
            </div>
        </div>
    );
};
