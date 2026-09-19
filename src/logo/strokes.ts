/**
 * Stroke geometry of the hand-drawn logo, in a 100×100 box. Provisional: edit
 * the data below to refine the design. Order and direction matter, since the
 * triangle redraw and the hold trace follow the strokes as the brush drew them.
 */

import { seededRandom } from '../seededRandom';

export type Point = [number, number];

/** A wobbly arc around `centre`; positive `sweepDeg` is clockwise on screen. */
type Arc = {
  kind: 'arc';
  centre: Point;
  radius: number;
  startDeg: number;
  sweepDeg: number;
  /** How far the brush strays from a true circle. */
  wobble: number;
  /** Seeds the wobble, so the stroke is the same on every render. */
  seed: number;
};

/** A slightly bowed line from `from` to `to`, overshooting its ends as a brush does. */
type Line = {
  kind: 'line';
  from: Point;
  to: Point;
  /** How far the brush runs on before `from` and past `to`. */
  overshoot: [number, number];
  /** How far the middle of the line may bow sideways. */
  bow: number;
  seed: number;
};

export type Stroke = {
  shape: Arc | Line;
  /** Base weight of the stroke. */
  width: number;
  /**
   * Stretches (as fractions of the stroke, in drawing order) where the brush
   * presses harder. They retrace the same path heavier rather than add a line.
   */
  pressure?: { from: number; to: number; width: number }[];
};

export type TracedStroke = {
  points: Point[];
  /** SVG path data along the brush's centre line. */
  d: string;
  /** What to ink: the whole stroke at its base weight, then any heavier stretches. */
  passes: { d: string; width: number }[];
};

// Doubled circle, both drawn clockwise. The outer one starts near one o'clock,
// where the original's overlapping ends are.
export const CIRCLE_STROKES: Stroke[] = [
  {
    shape: { kind: 'arc', centre: [49.5, 50.5], radius: 46.5, startDeg: -60, sweepDeg: 385, wobble: 0.9, seed: 11 },
    width: 0.8,
    pressure: [
      { from: 0.08, to: 0.3, width: 1.3 }, // top right
      { from: 0.88, to: 1, width: 1.1 }, // the overlapping end
    ],
  },
  {
    shape: { kind: 'arc', centre: [50.3, 49.8], radius: 43.2, startDeg: 150, sweepDeg: 372, wobble: 0.6, seed: 21 },
    width: 0.55,
    pressure: [{ from: 0.45, to: 0.6, width: 0.9 }],
  },
];

const OUTER_APEX: Point = [50, 11.5];
const INNER_APEX: Point = [50, 22.5];

// Doubled triangle in calligraphic order and direction (top to bottom, left to
// right): outer triangle first, as left fall, right fall, base; then the inner one.
export const TRIANGLE_STROKES: Stroke[] = [
  // outer left fall
  { shape: { kind: 'line', from: OUTER_APEX, to: [20.5, 68.5], overshoot: [0, 1.5], bow: 0.6, seed: 31 }, width: 0.7 },
  // tail, flicking off the left fall past the bottom-left corner
  { shape: { kind: 'line', from: [22.5, 65.5], to: [19, 71], overshoot: [0.3, 0.3], bow: 0.3, seed: 45 }, width: 1.2 },
  // outer right fall
  { shape: { kind: 'line', from: OUTER_APEX, to: [85, 72.5], overshoot: [0, 1.5], bow: 0.6, seed: 32 }, width: 0.8 },
  // outer base
  { shape: { kind: 'line', from: [43, 73.2], to: [85.5, 72.6], overshoot: [1, 1], bow: 0.6, seed: 44 }, width: 0.6 },
  // inner left fall
  { shape: { kind: 'line', from: INNER_APEX, to: [23, 68.5], overshoot: [0, 1.2], bow: 0.6, seed: 41 }, width: 0.6 },
  // inner right fall
  { shape: { kind: 'line', from: INNER_APEX, to: [77, 68.5], overshoot: [0, 1.2], bow: 0.6, seed: 42 }, width: 0.65 },
  // inner base, running across both triangles, slightly heavy
  { shape: { kind: 'line', from: [18, 69], to: [78, 68.8], overshoot: [0.5, 0.5], bow: 0.6, seed: 43 }, width: 0.9 },
];

function traceArc({ centre: [cx, cy], radius, startDeg, sweepDeg, wobble, seed }: Arc): Point[] {
  const random = seededRandom(seed);
  const harmonics = [2, 3, 5].map((k) => ({ k, amp: (wobble * (0.4 + random())) / k, phase: random() * 2 * Math.PI }));
  const steps = Math.ceil(Math.abs(sweepDeg) / 3);
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = ((startDeg + (sweepDeg * i) / steps) * Math.PI) / 180;
    // The brush drifts slightly inwards as the stroke goes on, so the ends overlap side by side.
    const drift = (-0.6 * i) / steps;
    const r = radius + drift + harmonics.reduce((sum, h) => sum + h.amp * Math.sin(h.k * t + h.phase), 0);
    points.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
  }
  return points;
}

function traceLine({ from: [x1, y1], to: [x2, y2], overshoot: [before, after], bow, seed }: Line): Point[] {
  const random = seededRandom(seed);
  const length = Math.hypot(x2 - x1, y2 - y1);
  const [ux, uy] = [(x2 - x1) / length, (y2 - y1) / length];
  const [nx, ny] = [-uy, ux];
  const bend = (random() - 0.5) * 2 * bow;
  const steps = 24;
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const along = -before * (1 - s) + (length + after) * s;
    // The ends stay put, so strokes meant to meet (like two falls from one apex) do.
    const offset = Math.sin(Math.PI * s) * (bend + (random() - 0.5) * 0.18);
    points.push([x1 + ux * along + nx * offset, y1 + uy * along + ny * offset]);
  }
  return points;
}

function toPathData(points: Point[]): string {
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
}

export function traceStroke(stroke: Stroke): TracedStroke {
  const points = stroke.shape.kind === 'arc' ? traceArc(stroke.shape) : traceLine(stroke.shape);
  const at = (fraction: number) => Math.round(fraction * (points.length - 1));
  const heavier = (stroke.pressure ?? []).map(({ from, to, width }) => ({
    d: toPathData(points.slice(at(from), at(to) + 1)),
    width,
  }));
  const d = toPathData(points);
  return { points, d, passes: [{ d, width: stroke.width }, ...heavier] };
}
