import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { createScreenGesture } from './screenGesture';

/**
 * Press handlers for the whole screen: tap to start, hold to stop. Nothing on
 * screen shows the hold: a medium haptic marks its halfway point (unlike the
 * light one of a round start), and a firm one its completion, with no bell.
 */
export function useScreenGesture(running: boolean, start: () => void, stop: () => void) {
  // Read at press time, so the gesture always sees the current session.
  const latest = useRef({ running, start, stop });
  latest.current = { running, start, stop };

  const [gesture] = useState(() =>
    createScreenGesture({
      isRunning: () => latest.current.running,
      onStart: () => latest.current.start(),
      onStop: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        latest.current.stop();
      },
      onHoldHalfway: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    }),
  );

  // A session that ends on its own (e.g. on leaving the app) takes the hold with it.
  useEffect(() => {
    if (!running) gesture.cancel();
  }, [running, gesture]);

  useEffect(() => () => gesture.cancel(), [gesture]);

  return { onPressIn: gesture.pressIn, onPressOut: gesture.pressOut, onPress: gesture.tap };
}
