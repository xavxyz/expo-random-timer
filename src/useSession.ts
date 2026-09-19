import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { startSession, type Session, type SessionSnapshot } from './sessionClock';
import { keepsSessionRunning } from './sessionGuards';

const POLL_MS = 250;
const KEEP_AWAKE_TAG = 'session';

/** Runs a session against the wall clock. `snapshot` is null while idle. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);

  const start = useCallback(() => {
    const now = Date.now();
    const next = startSession(now, Math.random);
    setSession(next);
    setSnapshot(next.advanceTo(now));
  }, []);

  const stop = useCallback(() => {
    setSession(null);
    setSnapshot(null);
  }, []);

  useEffect(() => {
    if (!session) return;
    const poll = setInterval(() => setSnapshot(session.advanceTo(Date.now())), POLL_MS);
    return () => clearInterval(poll);
  }, [session]);

  // Guards: the screen stays awake only while a session runs, and leaving the
  // foreground stops the session silently rather than timing without ringing.
  useEffect(() => {
    if (!session) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    const subscription = AppState.addEventListener('change', (state) => {
      if (!keepsSessionRunning(state)) stop();
    });
    return () => {
      subscription.remove();
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [session, stop]);

  return { snapshot, start, stop };
}
