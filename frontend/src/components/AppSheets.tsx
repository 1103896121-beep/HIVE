import { useTranslation } from 'react-i18next';
import { Sheet } from './Sheet';
import { SubjectPicker } from './SubjectPicker';
import { LocationPicker } from './LocationPicker';
import { TimerSettings } from './TimerSettings';
import { SquadPortal } from './SquadPortal';
import { BondsPortal } from './BondsPortal';
import { ThemePicker, type Theme } from './ThemePicker';
import { ProfilePortal, type UserProfile } from './ProfilePortal';
import { SubscriptionSheet } from './SubscriptionSheet';
import { LanguageSwitcher } from './LanguageSwitcher';
import type { Subject, Squad, BondEnriched, HiveMatchTile } from '../api/types';

export type SheetType = 'subject' | 'location' | 'timer' | 'squad' | 'bonds' | 'theme' | 'profile' | 'subscription' | null;

interface AppSheetsProps {
  activeSheet: SheetType;
  setActiveSheet: (sheet: SheetType) => void;
  subjects: Subject[];
  setCurrentSubject: (subject: string) => void;
  setCurrentLocation: (loc: string) => void;
  timeLeft: number;
  handleTimeSelect: (time: number) => void;
  squads: Squad[];
  bonds: BondEnriched[];
  hiveTiles: HiveMatchTile[];
  userId: string;
  handleCreateSquad: (name: string) => Promise<void>;
  handleLeaveSquad: (squadId: string) => Promise<void>;
  handleDisbandSquad: (squadId: string) => Promise<void>;
  showAlert: (title: string, msg: string) => void;
  sendNudge: (userId: string) => void;
  handleBlock: (userId: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  userProfile: UserProfile;
  handleUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  handleSignOut: () => void;
  isAuthenticated: boolean;
  trialStatus: { isExpired: boolean; isPremium: boolean; daysLeft: number; isPermanent: boolean };
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}

export function AppSheets({
  activeSheet, setActiveSheet, subjects, setCurrentSubject,
  setCurrentLocation, timeLeft, handleTimeSelect,
  squads, bonds, hiveTiles, userId, handleCreateSquad, handleLeaveSquad, handleDisbandSquad,
  showAlert, sendNudge, handleBlock, theme, setTheme,
  userProfile, handleUpdateProfile, handleSignOut, isAuthenticated, trialStatus, setUserProfile
}: AppSheetsProps) {
  const { t } = useTranslation();

  return (
    <>
      <Sheet isOpen={activeSheet === 'subject'} onClose={() => setActiveSheet(null)} title={t('sheets.select_subject')}>
        <SubjectPicker subjects={subjects} onSelect={(s) => { setCurrentSubject(s); setActiveSheet(null); }} />
      </Sheet>

      <Sheet isOpen={activeSheet === 'location'} onClose={() => setActiveSheet(null)} title={t('sheets.choose_location')}>
        <LocationPicker onSelect={(l) => { setCurrentLocation(l); setActiveSheet(null); }} />
      </Sheet>

      <Sheet isOpen={activeSheet === 'timer'} onClose={() => setActiveSheet(null)} title={t('sheets.focus_duration')}>
        <TimerSettings current={timeLeft} onSelect={handleTimeSelect} />
      </Sheet>

      <Sheet isOpen={activeSheet === 'squad'} onClose={() => setActiveSheet(null)} title={t('sheets.hive_hq')}>
        <SquadPortal
          squads={squads} bonds={bonds} userId={userId} hiveTiles={hiveTiles}
          onCreate={handleCreateSquad} onLeave={handleLeaveSquad}
          onDisband={handleDisbandSquad} onAlert={showAlert}
        />
      </Sheet>

      <Sheet isOpen={activeSheet === 'bonds'} onClose={() => setActiveSheet(null)} title={t('sheets.digital_bonds')}>
        <BondsPortal
          bonds={bonds} userId={userId} onNudge={sendNudge}
          onBlock={handleBlock} onAlert={showAlert}
        />
      </Sheet>

      <Sheet isOpen={activeSheet === 'theme'} onClose={() => setActiveSheet(null)} title={t('nav.settings')}>
        <div className="space-y-8 pb-8">
          <LanguageSwitcher />
          <div className="h-px w-full bg-white/5 mx-2"></div>
          <ThemePicker current={theme} onSelect={setTheme} />
        </div>
      </Sheet>

      <Sheet isOpen={activeSheet === 'profile'} onClose={() => setActiveSheet(null)} title={t('sheets.personal_profile')}>
        <ProfilePortal
          userId={userId} profile={userProfile} onUpdate={handleUpdateProfile}
          onSignOut={handleSignOut} onAlert={showAlert}
          trialStatus={trialStatus}
        />
      </Sheet>

      <Sheet
        isOpen={activeSheet === 'subscription' || (isAuthenticated && trialStatus.isExpired && !trialStatus.isPremium)}
        onClose={() => {
          if (trialStatus.isExpired && !trialStatus.isPremium) return;
          setActiveSheet(null);
        }}
        title={t('sheets.hive_membership')}
      >
        <SubscriptionSheet
          userId={userId}
          trialStatus={trialStatus}
          onSuccess={(expiresAt: string) => setUserProfile(prev => ({ ...prev, subscriptionEndAt: expiresAt }))}
          onClose={() => setActiveSheet(null)} onAlert={showAlert}
        />
      </Sheet>
    </>
  );
}
