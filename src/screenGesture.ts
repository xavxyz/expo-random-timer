/** How long the practitioner must hold anywhere on the screen to stop a session. */
export const HOLD_TO_STOP_MS = 1200;

type ScreenGestureOptions = {
  isRunning: () => boolean;
  onStart: () => void;
  onStop: () => void;
  /** Once per hold to stop, when it reaches halfway: the hold's only feedback. */
  onHoldHalfway: () => void;
};

/**
 * The whole screen is the control. While idle, a tap starts a session. While
 * running, a plain tap does nothing (left free for a future tap-to-reveal) and
 * holding for `HOLD_TO_STOP_MS` stops it; releasing early cancels the stop.
 *
 * Feed it the screen's press-in, press-out and tap (a release on the screen,
 * never a touch the OS cancelled). A press belongs to the state it began in, so
 * releasing a completed hold doesn't start a new session.
 */
export function createScreenGesture({ isRunning, onStart, onStop, onHoldHalfway }: ScreenGestureOptions) {
  let pressBeganIdle = false;
  let halfwayTimer: ReturnType<typeof setTimeout> | undefined;
  let holdTimer: ReturnType<typeof setTimeout> | undefined;

  const endHold = () => {
    clearTimeout(halfwayTimer);
    clearTimeout(holdTimer);
    halfwayTimer = undefined;
    holdTimer = undefined;
  };

  return {
    pressIn() {
      endHold();
      pressBeganIdle = !isRunning();
      if (pressBeganIdle) return;
      halfwayTimer = setTimeout(onHoldHalfway, HOLD_TO_STOP_MS / 2);
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
