import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { keepsSessionRunning } from './appLifecycle';
import { startSession, type Session, type SessionSnapshot } from './sessionClock';

const POLL_MS = 250;

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

  // Leaving the foreground stops the session silently rather than letting it
  // time without being able to ring.
  useEffect(() => {
    if (!session) return;
    if (!keepsSessionRunning(AppState.currentState)) {
      stop();
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (!keepsSessionRunning(state)) stop();
    });
    return () => subscription.remove();
  }, [session, stop]);

  return { snapshot, start, stop };
}
