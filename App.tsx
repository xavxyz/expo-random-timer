import { StatusBar } from 'expo-status-bar';
import { Unbounded_900Black, useFonts } from '@expo-google-fonts/unbounded';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { KeepAwake } from './src/KeepAwake';
import { BACKGROUND, DIM_INK } from './src/palette';
import { formatElapsed } from './src/sessionClock';
import { useScreenGesture } from './src/useScreenGesture';
import { useSession } from './src/useSession';

// Unbounded's digits average 0.87 em wide: 0.38 × 0.87 ≈ a third of the screen per digit.
const ROUND_FONT_SIZE_PER_WIDTH = 0.38;

export default function App() {
  const { snapshot, start, stop } = useSession();
  const { width } = useWindowDimensions();
  const pressHandlers = useScreenGesture(snapshot != null, start, stop);
  // Until the face loads the round stays hidden, rather than flashing in the system font.
  // Should it fail to load, the round falls back to the system font.
  const [fontLoaded, fontError] = useFonts({ Unbounded_900Black });

  return (
    // The whole screen is the control: there are no buttons.
    <Pressable style={styles.screen} {...pressHandlers}>
      {snapshot && <KeepAwake />}
      {snapshot && (fontLoaded || fontError) && (
        <Text
          style={[styles.round, { fontSize: width * ROUND_FONT_SIZE_PER_WIDTH }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {snapshot.round}
        </Text>
      )}
      {snapshot && <Text style={styles.elapsed}>{formatElapsed(snapshot.elapsedMs)}</Text>}
      <Text style={styles.hint}>{snapshot ? 'hold anywhere to stop' : 'tap to begin'}</Text>
      <StatusBar style="light" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
  },
  round: {
    color: DIM_INK,
    fontFamily: 'Unbounded_900Black',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  elapsed: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    color: DIM_INK,
    fontSize: 13,
    fontWeight: '300',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  hint: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    color: DIM_INK,
    fontSize: 12,
    fontWeight: '300',
    fontVariant: ['small-caps'],
    letterSpacing: 3,
    opacity: 0.7,
  },
});
