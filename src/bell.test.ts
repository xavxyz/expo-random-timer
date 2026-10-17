import { ringFromTop, type BellPlayer } from './bell';

/**
 * Mimics expo-audio on iOS: `seekTo` lands asynchronously while `play` acts at
 * once, and playing from the end of the sound is silent.
 */
function fakePlayer() {
  let atEnd = false;
  let playing = false;
  let rings = 0;
  const player: BellPlayer = {
    seekTo: async (seconds) => {
      await Promise.resolve();
      atEnd = false;
    },
    play: () => {
      playing = !atEnd;
      if (playing) rings++;
    },
  };
  return {
    player,
    rings: () => rings,
    /** The ring plays out to the end of the sound, as between two rounds. */
    playOut: () => {
      if (playing) atEnd = true;
      playing = false;
    },
  };
}

describe('bell', () => {
  it('rings the first time', async () => {
    const { player, rings } = fakePlayer();
    await ringFromTop(player);
    expect(rings()).toBe(1);
  });

  it('rings at every round once the previous ring has played out', async () => {
    const { player, rings, playOut } = fakePlayer();
    for (let round = 1; round <= 4; round++) {
      await ringFromTop(player);
      playOut();
    }
    expect(rings()).toBe(4);
  });
});
