import type { AppStateStatus } from 'react-native';

/**
 * A session can only ring while the app is in the foreground, so anything other
 * than `active` stops it. That includes `inactive`, which iOS reports when
 * Control Center or Notification Center is opened over the app.
 */
export function keepsSessionRunning(appState: AppStateStatus): boolean {
  return appState === 'active';
}
