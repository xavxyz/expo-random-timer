import { useCallback, useEffect, useState } from 'react';
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

  return { snapshot, start, stop };
}
