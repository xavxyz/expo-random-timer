import type { Timestamp } from './sessionClock';

/** How long the practitioner must hold anywhere on the screen to stop a session. */
export const HOLD_TO_STOP_MS = 1200;

type ScreenGestureOptions = {
  isRunning: () => boolean;
  onStart: () => void;
  onStop: () => void;
  /** When the hold to stop under way began, or null once it ends: drives the hold trace. */
  onHoldChange: (heldSince: Timestamp | null) => void;
};

/** How far through the hold to stop, from 0 at press-in to 1 at `HOLD_TO_STOP_MS`. */
export function holdProgress(heldMs: number): number {
  return Math.min(1, Math.max(0, heldMs / HOLD_TO_STOP_MS));
}

/**
 * The whole screen is the control. While idle, a tap starts a session. While
 * running, a plain tap does nothing (left free for a future tap-to-reveal) and
 * holding for `HOLD_TO_STOP_MS` stops it; releasing early cancels the stop.
 *
 * Feed it the screen's press-in, press-out and tap (a release on the screen,
 * never a touch the OS cancelled). A press belongs to the state it began in, so
 * releasing a completed hold doesn't start a new session.
 */
export function createScreenGesture({ isRunning, onStart, onStop, onHoldChange }: ScreenGestureOptions) {
  let pressBeganIdle = false;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;

  const endHold = () => {
    if (holdTimer === undefined) return;
    clearTimeout(holdTimer);
    holdTimer = undefined;
    onHoldChange(null);
  };

  return {
    pressIn() {
      endHold();
      pressBeganIdle = !isRunning();
      if (pressBeganIdle) return;
      onHoldChange(Date.now());
      holdTimer = setTimeout(() => {
        endHold();
        // The session may have ended on its own mid-hold, e.g. on leaving the app.
        if (isRunning()) onStop();
      }, HOLD_TO_STOP_MS);
    },
    pressOut: endHold,
    tap() {
      if (pressBeganIdle) onStart();
      pressBeganIdle = false;
    },
    /** Drops the press under way, e.g. when the session ends on its own. */
    cancel() {
      endHold();
      pressBeganIdle = false;
    },
  };
}
