import React from 'react';
import { AlertCircle, HelpCircle } from 'lucide-react';

interface CustomModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'alert' | 'confirm';
    onConfirm: () => void;
    onCancel?: () => void;
}

export const CustomModal: React.FC<CustomModalProps> = ({
    isOpen,
    title,
    message,
    type = 'alert',
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full bg-zinc-900 border border-white/10 rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                        {type === 'alert' ? (
                            <AlertCircle size={24} className="text-[var(--accent)]" />
                        ) : (
                            <HelpCircle size={24} className="text-blue-400" />
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-8">{message}</p>

                    <div className="flex w-full gap-3">
                        {type === 'confirm' && (
                            <button
                                onClick={onCancel}
                                className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/5 text-zinc-400 text-xs font-bold uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={onConfirm}
                            className="flex-1 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                            style={{
                                backgroundColor: type === 'alert' ? 'var(--accent)' : 'var(--accent)',
                                color: 'black',
                                boxShadow: '0 8px 20px rgba(var(--accent-rgb), 0.2)'
                            }}
                        >
                            {type === 'confirm' ? 'Confirm' : 'Got it'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
