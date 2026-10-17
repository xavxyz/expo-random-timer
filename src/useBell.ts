import { useCallback } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { ringFromTop } from './bell';

// Synthesised by scripts/synthesize-bell.mjs; swap in any recording.
const BELL = require('../assets/bell.wav');

// Set once at load, before any ring: sound through the iOS silent switch, and
// mix with music rather than lowering or pausing it.
setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' });

/** Returns a function that rings the soft bell from the top. */
export function useBell() {
  const player = useAudioPlayer(BELL);

  return useCallback(() => {
    ringFromTop(player);
  }, [player]);
}
