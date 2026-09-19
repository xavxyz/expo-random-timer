import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { startSession, type SessionSnapshot } from './sessionClock';
import { useBell } from './useBell';

const POLL_MS = 250;
const KEEP_AWAKE_TAG = 'session';

type Session = ReturnType<typeof startSession>;

/**
 * Runs a session: rings on start and on every round boundary, keeps the screen
 * awake, and ends the session as soon as the app leaves the foreground.
 * `snapshot` is null while idle.
 */
export function useSession() {
  const ringBell = useBell();
  const [session, setSession] = useState<Session | null>(null);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);

  // Marks the start of every round, round 1 included.
  const signalRound = useCallback(() => {
    ringBell();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [ringBell]);

  const start = useCallback(() => {
    const now = Date.now();
    const next = startSession(now, Math.random);
    setSession(next);
    setSnapshot(next.query(now));
    signalRound();
  }, [signalRound]);

  const end = useCallback(() => {
    setSession(null);
    setSnapshot(null);
  }, []);

  const stop = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    end();
  }, [end]);

  useEffect(() => {
    if (!session) return;

    activateKeepAwakeAsync(KEEP_AWAKE_TAG);
    const poll = setInterval(() => {
      const next = session.query(Date.now());
      if (next.boundaryCrossed) signalRound();
      setSnapshot(next);
    }, POLL_MS);
    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active') end();
    });

    return () => {
      clearInterval(poll);
      appState.remove();
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [session, signalRound, end]);

  return { snapshot, start, stop };
}
