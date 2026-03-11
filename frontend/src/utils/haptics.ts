/**
 * Haptic Feedback Utility for Hive
 * Provides a unified interface for haptic feedback across different platforms.
 */

export const triggerHaptic = (type: 'impact' | 'notification' | 'selection' = 'impact') => {
  // 1. Check for Capacitor Haptics (Primary for Native iOS/Android apps)
  const win = window as any;
  if (win.Capacitor?.Plugins?.Haptics) {
    try {
      if (type === 'impact') {
        win.Capacitor.Plugins.Haptics.impact({ style: 'medium' });
      } else if (type === 'notification') {
        win.Capacitor.Plugins.Haptics.notification({ type: 'SUCCESS' });
      } else {
        win.Capacitor.Plugins.Haptics.selectionStart();
      }
      return;
    } catch (e) {
      console.warn('Native Haptics failed, falling back to Web API');
    }
  }

  // 2. Fallback to Web Vibrate API (Works on Android/Chrome, NOT iOS Safari)
  if (navigator.vibrate) {
    if (type === 'notification') {
      navigator.vibrate([100, 30, 100, 30, 100]);
    } else {
      navigator.vibrate(50);
    }
  } else {
    // 3. For iOS Web (Safari), there's no programmatic vibration API.
    // We rely on UI visual feedback (which is already implemented in App.tsx)
    console.log('Haptic feedback requested: ', type, '(Not supported on this browser)');
  }
};
