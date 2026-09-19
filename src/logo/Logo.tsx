import { useEffect, useState } from 'react';
import Svg, { Path, Text } from 'react-native-svg';
import { INK } from '../palette';
import { holdProgress } from '../screenGesture';
import type { Timestamp } from '../sessionClock';
import { inkStroke } from './brush';
import { CIRCLE, MARK, TRIANGLE_CENTRE } from './strokes';

// Inked once: the geometry never changes at runtime. One path, so where strokes
// overlap the ink isn't laid twice at the logo's opacity.
const MARK_PATH = MARK.map((stroke) => inkStroke(stroke).inkUpTo(1)).join(' ');
const INKED_CIRCLE = inkStroke(CIRCLE);

const LOGO_OPACITY = 0.22;
const ROUND_FONT_SIZE = 22;
/** Distance from the digits' baseline up to their visual centre, per unit of font size. */
const DIGIT_HALF_HEIGHT = 0.36;

type LogoProps = {
  /** Width and height on screen; the drawing scales as a vector, so it stays crisp. */
  size: number;
  /** Shown inside the triangle; the triangle is empty when null. */
  round: number | null;
  /** When the hold to stop under way began, for the hold trace; null when there's none. */
  heldSince: Timestamp | null;
};

export function Logo({ size, round, heldSince }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d={MARK_PATH} fill={INK} opacity={LOGO_OPACITY} />
      {/* Keyed, so each hold traces from nothing. */}
      {heldSince != null && <HoldTrace key={heldSince} heldSince={heldSince} />}
      {round != null && (
        <Text
          x={TRIANGLE_CENTRE[0]}
          y={TRIANGLE_CENTRE[1] + ROUND_FONT_SIZE * DIGIT_HALF_HEIGHT}
          fontSize={ROUND_FONT_SIZE}
          fontWeight="200"
          fill={INK}
          textAnchor="middle"
        >
          {String(round)}
        </Text>
      )}
    </Svg>
  );
}

/**
 * The circle's own stroke lit up from its start, in its drawing direction, as
 * far as the hold has gone. Animates by itself, so only the trace redraws each frame.
 */
function HoldTrace({ heldSince }: { heldSince: Timestamp }) {
  const [traced, setTraced] = useState(0);

  useEffect(() => {
    let frame = requestAnimationFrame(function advance() {
      setTraced(holdProgress(Date.now() - heldSince));
      frame = requestAnimationFrame(advance);
    });
    return () => cancelAnimationFrame(frame);
  }, [heldSince]);

  return traced > 0 ? <Path d={INKED_CIRCLE.inkUpTo(traced)} fill={INK} /> : null;
}
