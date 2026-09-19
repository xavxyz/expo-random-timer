import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { KeepAwake } from './src/KeepAwake';
import { Logo } from './src/logo/Logo';
import { BACKGROUND, DIM_INK } from './src/palette';
import { formatElapsed } from './src/sessionClock';
import { useScreenGesture } from './src/useScreenGesture';
import { useSession } from './src/useSession';

// Slightly wider than the screen, so the circle bleeds past the edges.
const LOGO_SCALE = 1.02;

export default function App() {
  const { snapshot, start, stop } = useSession();
  const { width } = useWindowDimensions();
  const { pressHandlers, held } = useScreenGesture(snapshot != null, start, stop);

  return (
    // The whole screen is the control: there are no buttons.
    <Pressable style={styles.screen} {...pressHandlers}>
      {snapshot && <KeepAwake />}
      <View style={styles.centre}>
        <Logo size={width * LOGO_SCALE} round={snapshot?.round ?? null} traced={held} />
      </View>
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
    overflow: 'hidden',
  },
  centre: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
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
