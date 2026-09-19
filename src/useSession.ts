import { useCallback, useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { startSession, type Session, type SessionSnapshot } from './sessionClock';
import { useBell } from './useBell';

const POLL_MS = 250;

/**
 * Runs a session against the wall clock, ringing the bell with a light haptic
 * on start and at every round boundary. `snapshot` is null while idle.
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
    setSnapshot(next.advanceTo(now));
    signalRound();
  }, [signalRound]);

  const stop = useCallback(() => {
    setSession(null);
    setSnapshot(null);
  }, []);

  useEffect(() => {
    if (!session) return;
    const poll = setInterval(() => {
      const next = session.advanceTo(Date.now());
      // One signal per report, even when several boundaries were crossed at once.
      if (next.boundaryCrossed) signalRound();
      setSnapshot(next);
    }, POLL_MS);
    return () => clearInterval(poll);
  }, [session, signalRound]);

  return { snapshot, start, stop };
}
