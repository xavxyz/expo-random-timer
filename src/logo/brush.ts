/**
 * How a brush stroke of the mark is described, and how it becomes ink: filled
 * outline shapes, drawn in the brush's order and direction, whole or in part.
 */

export type Point = [number, number];

export type Stroke = {
  /**
   * The brush's centre line in drawing order, as runs of points joined by a
   * smooth curve. Each run starts where the previous one ends: the brush turns
   * sharply there without lifting.
   */
  centreLine: Point[][];
  /** Width along the centre line, from its start (0) to its end (1). */
  width: WidthStop[];
  /** Bristle streaks where the brush runs dry. */
  dryBrush: Streak[];
};

/** The stroke's width at a fraction of its length; widths between stops are interpolated. */
export type WidthStop = [fraction: number, width: number];

/** One bristle streak beside the centre line, tapering off towards its end. */
export type Streak = {
  /** Where it starts and ends, as fractions of the stroke's length. */
  from: number;
  to: number;
  /** Distance from the centre line; positive is to the right of the drawing direction. */
  offset: number;
  /** Width where it splits off. */
  width: number;
};

export type InkedStroke = {
  /** Length of the centre line. */
  length: number;
  /** Fractions of the length where the brush turns sharply without lifting. */
  turns: number[];
  /** SVG path data for the stroke inked up to `fraction` of its length (0 to 1), in drawing order. */
  inkUpTo(fraction: number): string;
};

/** Spacing of the samples along the centre line that outline the ink. */
const SAMPLE_SPACING = 0.75;

/** How far a sharp corner may reach out, per unit of half width. */
const MAX_MITER = 4;

/**
 * A point on the centre line, a distance `along` it, with the normal to its
 * right: a unit vector, except at a sharp corner where it reaches out further.
 */
type Sample = { along: number; point: Point; normal: Point };

const distance = (a: Point, b: Point) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** A Catmull-Rom curve through the run's points, sampled about every SAMPLE_SPACING. */
function traceRun(run: Point[]): Point[] {
  // Extend the run one point past each end, following its bend where it has one.
  const beyond = (end: Point, next: Point, afterNext: Point | undefined): Point =>
    afterNext
      ? [3 * end[0] - 3 * next[0] + afterNext[0], 3 * end[1] - 3 * next[1] + afterNext[1]]
      : [2 * end[0] - next[0], 2 * end[1] - next[1]];
  const last = run.length - 1;
  const extended = (i: number) =>
    i < 0 ? beyond(run[0], run[1], run[2]) : i > last ? beyond(run[last], run[last - 1], run[last - 2]) : run[i];
  const points: Point[] = [run[0]];
  for (let i = 1; i < run.length; i++) {
    const [p0, p1, p2, p3] = [extended(i - 2), extended(i - 1), extended(i), extended(i + 1)];
    const steps = Math.max(1, Math.ceil(distance(p1, p2) / SAMPLE_SPACING));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const curve = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
      points.push([curve(p0[0], p1[0], p2[0], p3[0]), curve(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return points;
}

/** Samples along a traced run, starting `startAlong` the whole centre line. */
function sampleRun(points: Point[], startAlong: number): Sample[] {
  let along = startAlong;
  return points.map((point, i) => {
    if (i > 0) along += distance(points[i - 1], point);
    const [x0, y0] = points[Math.max(0, i - 1)];
    const [x1, y1] = points[Math.min(points.length - 1, i + 1)];
    const length = Math.hypot(x1 - x0, y1 - y0);
    return { along, point, normal: [-(y1 - y0) / length, (x1 - x0) / length] };
  });
}

/** How far to reach out, per unit of half width, where the normal turns from `before` to `after`. */
function miter(before: Point, after: Point): Point {
  const [x, y] = [before[0] + after[0], before[1] + after[1]];
  const length = Math.hypot(x, y);
  // Cap how far a very sharp turn reaches out.
  const reach = Math.min(MAX_MITER, length / (x * before[0] + y * before[1]));
  return [(x / length) * reach, (y / length) * reach];
}

/** The stroke's width at a fraction of its length. */
export function widthAt(stroke: Stroke, fraction: number): number {
  const stops = stroke.width;
  const next = stops.findIndex(([f]) => f >= fraction);
  if (next === -1) return stops[stops.length - 1][1];
  if (next === 0) return stops[0][1];
  const [f0, w0] = stops[next - 1];
  const [f1, w1] = stops[next];
  return w0 + ((w1 - w0) * (fraction - f0)) / (f1 - f0);
}

/** The sample a distance `along` the centre line, between two others. */
function sampleAt(before: Sample, after: Sample, along: number): Sample {
  const t = after.along === before.along ? 0 : (along - before.along) / (after.along - before.along);
  const lerp = (a: Point, b: Point): Point => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return { along, point: lerp(before.point, after.point), normal: lerp(before.normal, after.normal) };
}

/** The samples between two distances along the centre line, starting and ending exactly there. */
function samplesBetween(samples: Sample[], from: number, until: number): Sample[] {
  if (until <= from) return [];
  // The first sample is at 0, so each end falls after it.
  const cut = (along: number) => {
    const after = samples.findIndex((sample) => sample.along >= along);
    return after === -1 ? samples[samples.length - 1] : sampleAt(samples[Math.max(0, after - 1)], samples[after], along);
  };
  return [cut(from), ...samples.filter(({ along }) => along > from && along < until), cut(until)];
}

/** A closed outline around the samples, `halfWidth` either side of a line `offset` right of the centre line. */
function outline(samples: Sample[], halfWidth: (sample: Sample) => number, offset = 0): string {
  if (samples.length < 2) return '';
  const side = (sign: number) =>
    samples.map((sample) => {
      const reach = offset + sign * halfWidth(sample);
      return [sample.point[0] + sample.normal[0] * reach, sample.point[1] + sample.normal[1] * reach];
    });
  const points = [...side(1), ...side(-1).reverse()];
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ') + ' Z';
}

/** Share of a streak's width left at `t`, from 0 where it splits off to 1 at its end. */
function streakTaper(t: number): number {
  return Math.sin((Math.PI / 2) * Math.min(1, t / 0.03)) * Math.pow(1 - t, 0.7);
}

export function inkStroke(stroke: Stroke): InkedStroke {
  const samples: Sample[] = [];
  const turnsAlong: number[] = [];
  for (const run of stroke.centreLine) {
    const corner = samples[samples.length - 1];
    const [first, ...rest] = sampleRun(traceRun(run), corner?.along ?? 0);
    if (!corner) {
      samples.push(first, ...rest);
      continue;
    }
    // One sample at the corner, reaching out to where both edges meet.
    corner.normal = miter(corner.normal, first.normal);
    turnsAlong.push(corner.along);
    samples.push(...rest);
  }
  const length = samples[samples.length - 1].along;
  const turns = turnsAlong.map((along) => along / length);
  const width = (sample: Sample) => widthAt(stroke, sample.along / length);

  return {
    length,
    turns,
    inkUpTo(fraction) {
      const reached = Math.min(1, Math.max(0, fraction)) * length;
      const body = outline(samplesBetween(samples, 0, reached), (sample) => width(sample) / 2);
      const streaks = stroke.dryBrush.map(({ from, to, offset, width: streakWidth }) => {
        const [start, end] = [from * length, to * length];
        return outline(
          samplesBetween(samples, start, Math.min(end, reached)),
          ({ along }) => (streakWidth / 2) * streakTaper((along - start) / (end - start)),
          offset,
        );
      });
      return [body, ...streaks].filter(Boolean).join(' ');
    },
  };
}
