import Svg, { G, Path, Text } from 'react-native-svg';
import { INK } from '../palette';
import { CIRCLE_STROKES, TRIANGLE_STROKES, traceStroke } from './strokes';

// Traced once: the geometry never changes at runtime.
const PASSES = [...CIRCLE_STROKES, ...TRIANGLE_STROKES].flatMap((stroke) => traceStroke(stroke).passes);

const LOGO_OPACITY = 0.22;
const ROUND_FONT_SIZE = 22;

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
          // Baseline placed so the digits' visual centre sits near the triangle's centroid.
          y={54 + ROUND_FONT_SIZE * 0.36}
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
