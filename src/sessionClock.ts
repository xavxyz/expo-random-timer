export type Random = () => number;

/** Wall-clock milliseconds since the epoch, as returned by `Date.now()`. */
export type Timestamp = number;

export type SessionSnapshot = {
  round: number;
  elapsedMs: number;
  boundaryCrossed: boolean;
};

export type Session = {
  /**
   * Moves the session to `now`. `boundaryCrossed` is true only on the first call
   * that reaches a new round, so advancing to the same instant again reports
   * the same round without re-reporting the boundary.
   */
  advanceTo(now: Timestamp): SessionSnapshot;
};

const MIN_ROUND_SECONDS = 180;
const MAX_ROUND_SECONDS = 420;

function drawRoundMs(random: Random): number {
  const span = MAX_ROUND_SECONDS - MIN_ROUND_SECONDS + 1;
  return (MIN_ROUND_SECONDS + Math.floor(random() * span)) * 1000;
}

export function startSession(startedAt: Timestamp, random: Random): Session {
  // Elapsed time (ms) at which each round reached so far ends; grows lazily.
  const roundEnds: number[] = [];
  let lastReportedRound = 1;

  return {
    advanceTo(now) {
      const elapsedMs = Math.max(0, now - startedAt);
      let round = 1;
      for (;; round++) {
        if (roundEnds.length < round) {
          roundEnds.push((roundEnds[round - 2] ?? 0) + drawRoundMs(random));
        }
        if (elapsedMs < roundEnds[round - 1]) break;
      }
      const boundaryCrossed = round > lastReportedRound;
      lastReportedRound = Math.max(lastReportedRound, round);
      return { round, elapsedMs, boundaryCrossed };
    },
  };
}

/** `mm:ss` below one hour, `h:mm:ss` from one hour on. */
export function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
