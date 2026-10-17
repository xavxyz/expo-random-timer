import type { AudioPlayer } from 'expo-audio';

export type BellPlayer = Pick<AudioPlayer, 'seekTo' | 'play'>;

/**
 * Rings the bell from the top. Once a ring has played out the player rests at
 * the end of the sound, and `play` acts at once while `seekTo` lands later:
 * playing before the seek lands is silent.
 */
export async function ringFromTop(player: BellPlayer) {
  await player.seekTo(0);
  player.play();
}
