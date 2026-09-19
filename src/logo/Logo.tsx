import Svg, { G, Path, Text } from 'react-native-svg';
import { INK } from '../palette';
import { CIRCLE_STROKES, TRIANGLE_STROKES, traceStroke } from './strokes';

// Traced once: the geometry never changes at runtime.
const PASSES = [...CIRCLE_STROKES, ...TRIANGLE_STROKES].flatMap((stroke) => traceStroke(stroke).passes);

const LOGO_OPACITY = 0.22;
const ROUND_FONT_SIZE = 22;
/** Height of the triangle's visual centre in the 100×100 drawing. */
const TRIANGLE_CENTRE_Y = 54;
/** Distance from the digits' baseline up to their visual centre, per unit of font size. */
const DIGIT_HALF_HEIGHT = 0.36;

type LogoProps = {
  /** Width and height on screen; the drawing scales as a vector, so it stays crisp. */
  size: number;
  /** Shown inside the triangle; the triangle is empty when null. */
  round: number | null;
};

export function Logo({ size, round }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G opacity={LOGO_OPACITY}>
        {PASSES.map(({ d, width }, i) => (
          <Path
            key={i}
            d={d}
            stroke={INK}
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </G>
      {round != null && (
        <Text
          x={50}
          y={TRIANGLE_CENTRE_Y + ROUND_FONT_SIZE * DIGIT_HALF_HEIGHT}
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
