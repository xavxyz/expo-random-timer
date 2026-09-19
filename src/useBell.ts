import { useCallback, useEffect } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

// Synthesised by scripts/synthesize-bell.mjs; swap in any recording.
const BELL = require('../assets/bell.wav');

/** Returns a function that rings the soft bell from the top. */
export function useBell() {
  const player = useAudioPlayer(BELL);

  useEffect(() => {
    // Ring through the iOS silent switch, and mix with music rather than pausing it.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });
  }, []);

  return useCallback(() => {
    player.seekTo(0);
    player.play();
  }, [player]);
}
