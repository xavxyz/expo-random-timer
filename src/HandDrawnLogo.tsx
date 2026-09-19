// Hand-drawn imitation of the school mark (doubled wobbly circle around a
// doubled triangle), generated from seeded noise so it renders identically
// every time. Vector, so it stays crisp at any size.
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { INK } from './palette';

type Point = [number, number];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function toPath(points: Point[]) {
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ');
}

function wobblyArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  sweepDeg: number,
  seed: number,
  amp = 0.3,
  clip: [number, number] = [0, 1],
): string {
  const rand = seeded(seed);
  const harmonics = [2, 3, 5].map((k) => ({ k, a: amp * (0.4 + rand()) / k, p: rand() * Math.PI * 2 }));
  const steps = Math.ceil(Math.abs(sweepDeg) / 3);
  const pts: Point[] = [];
  for (let i = Math.round(clip[0] * steps); i <= Math.round(clip[1] * steps); i++) {
    const t = ((startDeg + (sweepDeg * i) / steps) * Math.PI) / 180;
    // the pen drifts slightly inward as the stroke goes on
    const drift = (-0.6 * i) / steps;
    const rr = r + drift + harmonics.reduce((sum, h) => sum + h.a * Math.sin(h.k * t + h.p), 0);
    pts.push([cx + rr * Math.cos(t), cy + rr * Math.sin(t)]);
  }
  return toPath(pts);
}

function wobblyLine(from: Point, to: Point, seed: number, overshoot = 1.5, bow = 0.6, overshootStart = overshoot): string {
  const rand = seeded(seed);
  const [x1, y1] = from;
  const [x2, y2] = to;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const nx = -uy;
  const ny = ux;
  const bend = (rand() - 0.5) * 2 * bow;
  const pts: Point[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const along = -overshootStart * (1 - s) + (len + overshoot) * s;
    const off = Math.sin(Math.PI * s) * bend + (rand() - 0.5) * 0.18;
    pts.push([x1 + ux * along + nx * off, y1 + uy * along + ny * off]);
  }
  return toPath(pts);
}

// Geometry in a 100×100 box, eyeballed from the 80px original.
const OUTER_TRI: Point[] = [[50, 11.5], [20.5, 68.5], [85, 72.5]];
const INNER_TRI: Point[] = [[50, 22.5], [23, 68.5], [77, 68.5]];

const OUTER_CIRCLE = [49.5, 50.5, 46.5, -60, 385, 11, 0.9] as const;
const INNER_CIRCLE = [50.3, 49.8, 43.2, 150, 372, 21, 0.6] as const;

// [path, strokeWidth] — pressure passes re-trace a stretch of the same stroke
// thicker, giving the uneven brush weight without a visible second line.
const STROKES: [string, number][] = [
  [wobblyArc(...OUTER_CIRCLE), 0.8],
  [wobblyArc(...OUTER_CIRCLE, [0.08, 0.3]), 1.3], // pressure at the top-right
  [wobblyArc(...OUTER_CIRCLE, [0.88, 1]), 1.1], // the overlapping tail
  [wobblyArc(...INNER_CIRCLE), 0.55],
  [wobblyArc(...INNER_CIRCLE, [0.45, 0.6]), 0.9],
  [wobblyLine(OUTER_TRI[0], OUTER_TRI[1], 31, 1.5, 0.6, 0), 0.7],
  [wobblyLine(OUTER_TRI[0], OUTER_TRI[2], 32, 1.5, 0.6, 0), 0.8],
  [wobblyLine(INNER_TRI[0], INNER_TRI[1], 41, 1.2, 0.6, 0), 0.6],
  [wobblyLine(INNER_TRI[0], INNER_TRI[2], 42, 1.2, 0.6, 0), 0.65],
  [wobblyLine([18, 69], [78, 68.8], 43, 0.5), 0.9], // shared base, slightly heavy
  [wobblyLine([43, 73.2], [85.5, 72.6], 44, 1), 0.6], // second base stroke
  [wobblyLine([22.5, 65.5], [19, 71], 45, 0.3, 0.3), 1.2], // tail at bottom-left
];

const LOGO_OPACITY = 0.4;
const ROUND_FONT_SIZE = 17;

export type HandDrawnLogoProps = {
  size: number;
  /** Shown inside the triangle; null leaves it empty. */
  round: number | null;
};

export function HandDrawnLogo({
  size,
  round,
}: HandDrawnLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G opacity={LOGO_OPACITY}>
        {STROKES.map(([d, w], i) => (
          <Path key={i} d={d} stroke={INK} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ))}
      </G>
      {round != null && (
        <SvgText
          x={50}
          // baseline placed so the digits' visual centre sits near the triangle's centroid
          y={54 + ROUND_FONT_SIZE * 0.36}
          fontSize={ROUND_FONT_SIZE}
          fontWeight="200"
          fill={INK}
          textAnchor="middle"
        >
          {String(round)}
        </SvgText>
      )}
    </Svg>
  );
}
