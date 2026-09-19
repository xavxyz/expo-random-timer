/** How long the practitioner must hold anywhere on the screen to stop a session. */
export const HOLD_TO_STOP_MS = 1200;

type ScreenGestureOptions = {
  isRunning: () => boolean;
  onStart: () => void;
  onStop: () => void;
};

/**
 * The whole screen is the control. While idle, releasing a press starts a
 * session. While running, a plain tap does nothing (left free for a future
 * tap-to-reveal) and holding for `HOLD_TO_STOP_MS` stops it; releasing early
 * cancels the stop. A press belongs to the state it began in, so releasing a
 * completed hold doesn't start a new session.
 */
export function createScreenGesture({ isRunning, onStart, onStop }: ScreenGestureOptions) {
  let press: 'tap' | 'hold' | null = null;
  let hold: ReturnType<typeof setTimeout> | undefined;

  const cancelHold = () => {
    clearTimeout(hold);
    hold = undefined;
  };

  return {
    pressIn() {
      cancelHold();
      if (!isRunning()) {
        press = 'tap';
        return;
      }
      press = 'hold';
      hold = setTimeout(() => {
        hold = undefined;
        onStop();
      }, HOLD_TO_STOP_MS);
    },
    pressOut() {
      cancelHold();
      if (press === 'tap') onStart();
      press = null;
    },
    dispose() {
      cancelHold();
      press = null;
    },
  };
}
