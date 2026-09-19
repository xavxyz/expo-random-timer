import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { createScreenGesture } from './screenGesture';

/**
 * Press handlers for the whole screen: tap to start, hold to stop. Completing
 * the hold plays a firm haptic, and no bell.
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
    }),
  );

  useEffect(() => () => gesture.dispose(), [gesture]);

  return { onPressIn: gesture.pressIn, onPressOut: gesture.pressOut, onPress: gesture.tap };
}
