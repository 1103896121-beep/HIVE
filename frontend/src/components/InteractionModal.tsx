import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import type { BondEnriched } from '../api/types';

export interface InteractionUser {
  user_id: string;
  name: string;
  avatar_url?: string;
  subject?: string;
}

interface Props {
  user: InteractionUser | null;
  bonds: BondEnriched[];
  onClose: () => void;
  onCreateBond: (userId: string) => void;
  onNudge: (userId: string) => void;
}

export function InteractionModal({ user, bonds, onClose, onCreateBond, onNudge }: Props) {
  const { t } = useTranslation();
  const [isNudged, setIsNudged] = useState(false);
  if (!user) return null;

  const bondRecord = bonds.find(b => b.user_id_1 === user.user_id || b.user_id_2 === user.user_id);
  const isAccepted = bondRecord?.status === 'ACCEPTED';
  const isPending = bondRecord?.status === 'PENDING';

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[300px] bg-zinc-900 border border-white/10 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 border-2 border-white/5">
          <img 
            src={user.avatar_url || `https://i.pravatar.cc/150?u=${user.user_id}`} 
            onError={(e) => { e.currentTarget.src = `https://i.pravatar.cc/150?u=${user.user_id}`; }}
            alt={user.name} 
            className="w-full h-full object-cover" 
          />
        </div>
        <h3 className="text-xl font-bold text-white mb-1">{user.name}</h3>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-8">
          {user.subject 
            ? (t(`subjects.${user.subject.toLowerCase()}`, user.subject) as string)
            : (t('common.relaxing') as string)}
        </p>

        <div className="flex w-full flex-col gap-3">
          {isAccepted ? (
            <div className="w-full py-4 text-zinc-500 text-[10px] font-black uppercase tracking-widest text-center border border-white/5 rounded-2xl">
              {t('bonds.already_bonded', 'Already Bonded')}
            </div>
          ) : isPending ? (
            <div className="w-full py-4 text-[#F5A623] text-[10px] font-black uppercase tracking-widest text-center border border-[#F5A623]/20 bg-[#F5A623]/5 rounded-2xl">
              {t('bonds.request_pending', 'Request Pending')}
            </div>
          ) : (
            <button
              onClick={() => {
                onCreateBond(user.user_id);
                onClose();
              }}
              className="w-full py-4 rounded-2xl bg-[var(--accent)] text-black text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg"
              style={{ boxShadow: '0 8px 20px rgba(var(--accent-rgb), 0.3)' }}
            >
              {t('bonds.request_bond')}
            </button>
          )}
          <button
            onClick={() => {
              onNudge(user.user_id);
              setIsNudged(true);
              setTimeout(() => {
                setIsNudged(false);
              }, 300);
            }}
            className={`w-full py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              isNudged 
                ? 'bg-[#F5A623]/20 border-[#F5A623]/50 text-[#F5A623] scale-95' 
                : 'bg-white/5 border-white/10 text-white hover:bg-white/10 active:scale-95'
            }`}
          >
            {isNudged ? (
              <>
                <Zap size={14} strokeWidth={3} className="fill-current" />
                {t('common.success', 'Nudged!')}
              </>
            ) : (
              t('bonds.nudge')
            )}
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest hover:text-zinc-400 p-2"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
