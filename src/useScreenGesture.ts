import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { createScreenGesture, holdProgress } from './screenGesture';

/**
 * Press handlers for the whole screen: tap to start, hold to stop. Completing
 * the hold plays a firm haptic, and no bell. `held` is how far through the hold
 * to stop the practitioner is, from 0 (not holding) to 1, updated every frame.
 */
export function useScreenGesture(running: boolean, start: () => void, stop: () => void) {
  // Read at press time, so the gesture always sees the current session.
  const latest = useRef({ running, start, stop });
  latest.current = { running, start, stop };
  // When the current hold to stop began, or null when not holding.
  const [heldSince, setHeldSince] = useState<number | null>(null);
  const [held, setHeld] = useState(0);

  const [gesture] = useState(() =>
    createScreenGesture({
      isRunning: () => latest.current.running,
      onStart: () => latest.current.start(),
      onStop: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        latest.current.stop();
      },
      onHoldChange: (holding) => setHeldSince(holding ? Date.now() : null),
    }),
  );

  useEffect(() => () => gesture.dispose(), [gesture]);

  useEffect(() => {
    if (heldSince == null) {
      setHeld(0);
      return;
    }
    let frame = requestAnimationFrame(function advance() {
      setHeld(holdProgress(Date.now() - heldSince));
      frame = requestAnimationFrame(advance);
    });
    return () => cancelAnimationFrame(frame);
  }, [heldSince]);

  return {
    pressHandlers: { onPressIn: gesture.pressIn, onPressOut: gesture.pressOut, onPress: gesture.tap },
    held,
  };
}
