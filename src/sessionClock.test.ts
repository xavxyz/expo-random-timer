import { seededRandom } from './seededRandom';
import { formatElapsed, startSession } from './sessionClock';

const T0 = 1_700_000_000_000;
const lowest = () => 0;
// Math.random() never returns 1; this is as high as it gets.
const highest = () => 0.9999999999999999;

// Returns the given values in order, then repeats the last one.
function sequence(...values: number[]) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('session clock', () => {
  it('is in round 1 with no elapsed time at the start', () => {
    const session = startSession(T0, lowest);
    expect(session.advanceTo(T0)).toEqual({ round: 1, elapsedMs: 0, boundaryCrossed: false });
  });

  it('lasts exactly 3:00 per round when the random source is at its lowest', () => {
    const session = startSession(T0, lowest);
    expect(session.advanceTo(T0 + 179_999).round).toBe(1);
    expect(session.advanceTo(T0 + 180_000).round).toBe(2);
  });

  it('lasts exactly 7:00 per round when the random source is at its highest', () => {
    const session = startSession(T0, highest);
    expect(session.advanceTo(T0 + 419_999).round).toBe(1);
    expect(session.advanceTo(T0 + 420_000).round).toBe(2);
  });

  it('changes round exactly on a later boundary', () => {
    // 3:00 then 7:00, so round 3 begins at 10:00.
    const session = startSession(T0, sequence(0, highest(), 0));
    expect(session.advanceTo(T0 + 599_999).round).toBe(2);
    expect(session.advanceTo(T0 + 600_000).round).toBe(3);
  });

  it('reports a boundary crossing exactly once', () => {
    const session = startSession(T0, lowest);
    expect(session.advanceTo(T0 + 179_900).boundaryCrossed).toBe(false);
    expect(session.advanceTo(T0 + 180_100).boundaryCrossed).toBe(true);
    expect(session.advanceTo(T0 + 180_300).boundaryCrossed).toBe(false);
  });

  it('lands on the right round, reported once, after a jump across several boundaries', () => {
    const session = startSession(T0, lowest);
    session.advanceTo(T0);
    // 10 × 3:00 rounds have ended at 30:00, so 30:05 is in round 11.
    expect(session.advanceTo(T0 + 1_805_000)).toEqual({ round: 11, elapsedMs: 1_805_000, boundaryCrossed: true });
    expect(session.advanceTo(T0 + 1_805_200).boundaryCrossed).toBe(false);
  });

  it('keeps every round a whole number of seconds between 3:00 and 7:00 over a long session', () => {
    const session = startSession(T0, seededRandom(7));
    const boundaries: number[] = [0];
    let round = 1;
    for (let s = 1; s <= 3 * 3600; s++) {
      const justBefore = session.advanceTo(T0 + s * 1000 - 1).round;
      const onTheSecond = session.advanceTo(T0 + s * 1000).round;
      expect(justBefore).toBe(round);
      if (onTheSecond !== round) {
        expect(onTheSecond).toBe(round + 1);
        boundaries.push(s);
        round = onTheSecond;
      }
    }
    const durations = boundaries.slice(1).map((b, i) => b - boundaries[i]);
    expect(durations.length).toBeGreaterThan(25);
    for (const d of durations) {
      expect(d).toBeGreaterThanOrEqual(180);
      expect(d).toBeLessThanOrEqual(420);
    }
    expect(new Set(durations).size).toBeGreaterThan(1);
  });

  it('stays at the start if the wall clock moves back before it', () => {
    const session = startSession(T0, lowest);
    expect(session.advanceTo(T0 - 5_000)).toEqual({ round: 1, elapsedMs: 0, boundaryCrossed: false });
  });

  it('reports the same round without re-reporting the boundary when advanced to the same instant twice', () => {
    const session = startSession(T0, seededRandom(42));
    const first = session.advanceTo(T0 + 3_600_000);
    expect(session.advanceTo(T0 + 3_600_000)).toEqual({ ...first, boundaryCrossed: false });
  });
});

describe('formatElapsed', () => {
  it.each([
    [0, '00:00'],
    [999, '00:00'],
    [65_000, '01:05'],
    [3_599_999, '59:59'],
    [3_600_000, '1:00:00'],
    [3_661_000, '1:01:01'],
    [36_005_000, '10:00:05'],
  ])('formats %d ms as %s', (ms, expected) => {
    expect(formatElapsed(ms)).toBe(expected);
  });
});
