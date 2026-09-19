import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { HandDrawnLogo } from './src/HandDrawnLogo';
import { HoldToStopButton, StartButton } from './src/controls';
import { BACKGROUND, DIM_INK } from './src/palette';
import { formatElapsed } from './src/sessionClock';
import { useSession } from './src/useSession';

export default function App() {
  const { snapshot, start, stop } = useSession();
  const { width } = useWindowDimensions();

  return (
    <View style={styles.screen}>
      <HandDrawnLogo size={Math.min(width, 520) * 0.8} round={snapshot?.round ?? null} />
      <View style={styles.below}>
        {/* Kept in the layout while idle so Start and Hold to stop share a spot. */}
        <Text
          style={[styles.elapsed, !snapshot && styles.hidden]}
          accessibilityElementsHidden={!snapshot}
          importantForAccessibility={snapshot ? 'auto' : 'no-hide-descendants'}
        >
          {formatElapsed(snapshot?.elapsedMs ?? 0)}
        </Text>
        {snapshot ? <HoldToStopButton onStop={stop} /> : <StartButton onPress={start} />}
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND, alignItems: 'center', justifyContent: 'center' },
  below: { alignItems: 'center', gap: 20, marginTop: 28 },
  elapsed: { color: DIM_INK, fontSize: 18, fontWeight: '300', fontVariant: ['tabular-nums'], letterSpacing: 1 },
  hidden: { opacity: 0 },
});
