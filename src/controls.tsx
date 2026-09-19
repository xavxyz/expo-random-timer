import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DIM_INK, INK } from './palette';

const HOLD_MS = 1200;
const WIDTH = 200;
const HEIGHT = 52;
const STROKE = 1.5;

// Pill outline traced clockwise from the top centre, inset by half the stroke.
const INSET = STROKE / 2;
const RADIUS = HEIGHT / 2 - INSET;
const OUTLINE = [
  `M ${WIDTH / 2} ${INSET}`,
  `H ${WIDTH - INSET - RADIUS}`,
  `A ${RADIUS} ${RADIUS} 0 0 1 ${WIDTH - INSET - RADIUS} ${HEIGHT - INSET}`,
  `H ${INSET + RADIUS}`,
  `A ${RADIUS} ${RADIUS} 0 0 1 ${INSET + RADIUS} ${INSET}`,
  'Z',
].join(' ');
const PERIMETER = 2 * (WIDTH - 2 * INSET - 2 * RADIUS) + 2 * Math.PI * RADIUS;

function Pill({ label, progress = 0 }: { label: string; progress?: number }) {
  return (
    <>
      <Svg width={WIDTH} height={HEIGHT} style={StyleSheet.absoluteFill}>
        <Path d={OUTLINE} stroke={DIM_INK} strokeWidth={1} fill="none" />
        {progress > 0 && (
          <Path
            d={OUTLINE}
            stroke={INK}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${PERIMETER} ${PERIMETER}`}
            strokeDashoffset={PERIMETER * (1 - progress)}
          />
        )}
      </Svg>
      <Text style={styles.label}>{label}</Text>
    </>
  );
}

export function StartButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.pill} accessibilityRole="button">
      <Pill label="Start" />
    </Pressable>
  );
}

/** Stops only after a continuous 1.2 s hold; the outline fills meanwhile, and releasing early cancels. */
export function HoldToStopButton({ onStop }: { onStop: () => void }) {
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | null>(null);

  const cancel = () => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setProgress(0);
  };

  const begin = () => {
    const pressedAt = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - pressedAt) / HOLD_MS);
      if (p >= 1) {
        frame.current = null;
        onStop();
        return;
      }
      setProgress(p);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  useEffect(() => cancel, []);

  return (
    <Pressable onPressIn={begin} onPressOut={cancel} style={styles.pill} accessibilityRole="button">
      <Pill label="Hold to stop" progress={progress} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: { width: WIDTH, height: HEIGHT, alignItems: 'center', justifyContent: 'center' },
  label: { color: INK, fontSize: 16, fontWeight: '300', letterSpacing: 1.5 },
});
