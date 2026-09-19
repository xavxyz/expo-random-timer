import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { createScreenGesture } from './screenGesture';
import type { Timestamp } from './sessionClock';

/**
 * Press handlers for the whole screen: tap to start, hold to stop. Completing
 * the hold plays a firm haptic, and no bell. `heldSince` is when the hold to
 * stop under way began, or null when there's none.
 */
export function useScreenGesture(running: boolean, start: () => void, stop: () => void) {
  // Read at press time, so the gesture always sees the current session.
  const latest = useRef({ running, start, stop });
  latest.current = { running, start, stop };
  const [heldSince, setHeldSince] = useState<Timestamp | null>(null);

  const [gesture] = useState(() =>
    createScreenGesture({
      isRunning: () => latest.current.running,
      onStart: () => latest.current.start(),
      onStop: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        latest.current.stop();
      },
      onHoldChange: setHeldSince,
    }),
  );

  // A session that ends on its own (e.g. on leaving the app) takes the hold with it.
  useEffect(() => {
    if (!running) gesture.cancel();
  }, [running, gesture]);

  useEffect(() => () => gesture.cancel(), [gesture]);

  return {
    pressHandlers: { onPressIn: gesture.pressIn, onPressOut: gesture.pressOut, onPress: gesture.tap },
    heldSince,
  };
}
