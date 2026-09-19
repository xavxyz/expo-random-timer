// Measures the school's mark from a reference image and prints the stroke data
// for src/logo/strokes.ts. The image isn't in the repo (see issue #10 for it).
// The printed module is a starting point for strokes.ts, to edit by hand from there.
// Run: node scripts/measure-mark.mjs path/to/mark.png > src/logo/strokes.ts
//
// Each stroke is scanned across, every pixel or so along a guide: a fitted
// circle, or lines fitted to the triangle's sides. Across the stroke, the ink
// splits into spans. The main span (the stroke's body) is the one along the
// stroke's steady edge (its keel); any other span is a dry-brush streak.
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const [imagePath] = process.argv.slice(2);
if (!imagePath) throw new Error('Usage: node scripts/measure-mark.mjs path/to/mark.png');

// --- Reading the image -------------------------------------------------------

/** Decodes an 8-bit, non-interlaced PNG into darkness values from 0 (paper) to 1 (ink). */
function readPng(path) {
  const file = readFileSync(path);
  let width, height, colourType, palette;
  const data = [];
  for (let at = 8; at < file.length; ) {
    const length = file.readUInt32BE(at);
    const type = file.toString('ascii', at + 4, at + 8);
    const chunk = file.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      [width, height] = [chunk.readUInt32BE(0), chunk.readUInt32BE(4)];
      colourType = chunk[9];
      if (chunk[8] !== 8 || chunk[12] !== 0) throw new Error('Only 8-bit, non-interlaced PNGs');
    }
    if (type === 'PLTE') palette = chunk;
    if (type === 'IDAT') data.push(chunk);
    at += 12 + length;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colourType];
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const value = raw[y * (stride + 1) + 1 + i];
      const left = i >= channels ? pixels[y * stride + i - channels] : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + i] : 0;
      const upLeft = y > 0 && i >= channels ? pixels[(y - 1) * stride + i - channels] : 0;
      const paeth = () => {
        const p = left + up - upLeft;
        const [a, b, c] = [Math.abs(p - left), Math.abs(p - up), Math.abs(p - upLeft)];
        return a <= b && a <= c ? left : b <= c ? up : upLeft;
      };
      const predicted = [0, left, up, (left + up) >> 1, paeth()][filter];
      pixels[y * stride + i] = (value + predicted) & 0xff;
    }
  }
  const darkness = new Float64Array(width * height);
  for (let p = 0; p < width * height; p++) {
    const px = pixels.subarray(p * channels, (p + 1) * channels);
    const rgb = colourType === 3 ? [...palette.subarray(px[0] * 3, px[0] * 3 + 3)] : channels < 3 ? [px[0], px[0], px[0]] : [...px.subarray(0, 3)];
    const alpha = channels === 2 || channels === 4 ? px[channels - 1] / 255 : 1;
    const grey = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    darkness[p] = alpha * (1 - grey);
  }
  return { width, height, darkness };
}

const image = readPng(imagePath);
const size = image.width;

/** Bilinear darkness at a point between pixel centres. */
function darknessAt(x, y) {
  const [x0, y0] = [Math.floor(x), Math.floor(y)];
  const pixel = (px, py) =>
    px < 0 || py < 0 || px >= image.width || py >= image.height ? 0 : image.darkness[py * image.width + px];
  const [fx, fy] = [x - x0, y - y0];
  return (
    pixel(x0, y0) * (1 - fx) * (1 - fy) + pixel(x0 + 1, y0) * fx * (1 - fy) + pixel(x0, y0 + 1) * (1 - fx) * fy + pixel(x0 + 1, y0 + 1) * fx * fy
  );
}

// --- Scanning across a stroke ------------------------------------------------

const ACROSS_STEP = 0.25;

const distance = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Spans of ink across the stroke at `point`, as [start, end] offsets along `normal` within `band`. */
function spansAcross([x, y], [nx, ny], [low, high]) {
  const spans = [];
  let start = null;
  for (let offset = low; offset <= high + 1e-9; offset += ACROSS_STEP) {
    const inked = darknessAt(x + nx * offset, y + ny * offset) > 0.5;
    if (inked && start === null) start = offset;
    if (!inked && start !== null) {
      spans.push([start, offset - ACROSS_STEP]);
      start = null;
    }
  }
  if (start !== null) spans.push([start, high]);
  return spans;
}

/**
 * Scans a stroke along its guide: samples of { point, normal } in drawing order,
 * the normal pointing to the right of the drawing direction. `keel` is the side
 * (+1 right, -1 left) of the stroke's steady edge. Stretches of the guide, as
 * fractions, may be `occluded` by another stroke, so the body there is
 * interpolated and no streaks are read; or `crossed` by a thin one, where the
 * body is read unless it merges with it (it suddenly widens), but no streaks.
 */
function scanStroke(guide, { band, keel, occluded = [], crossed = [] }) {
  const within = (ranges, i) => ranges.some(([from, to]) => i / (guide.length - 1) >= from && i / (guide.length - 1) <= to);
  const keelEdge = ([start, end]) => (keel > 0 ? end : start);
  let [lastKeel, lastWidth] = [null, Infinity];
  const scans = guide.map(({ point, normal }, i) => {
    const spans = spansAcross(point, normal, band);
    if (within(occluded, i) || spans.length === 0) return { body: null, others: [] };
    // The body is the span along the keel: the keel-most one at first, then the one
    // that carries on the keel, which runs steadily from sample to sample.
    const byKeel = [...spans].sort((a, b) =>
      lastKeel === null ? keel * (keelEdge(b) - keelEdge(a)) : Math.abs(keelEdge(a) - lastKeel) - Math.abs(keelEdge(b) - lastKeel),
    );
    const body = byKeel[0];
    const width = body[1] - body[0] + ACROSS_STEP;
    const others = spans.filter((span) => span !== body);
    // A body cut short by the edge of the band, or suddenly wider, is merged with another stroke.
    if (body[0] <= band[0] || body[1] >= band[1]) return { body: null, others: [] };
    if (within(crossed, i)) return { body: width <= lastWidth + 1 ? body : null, others: [] };
    [lastKeel, lastWidth] = [keelEdge(body), width];
    return { body, others };
  });
  // Fill in hidden stretches of the body from the nearest visible samples either side.
  const centre = fillGaps(scans.map(({ body }) => (body ? (body[0] + body[1]) / 2 : null)));
  const width = fillGaps(scans.map(({ body }) => (body ? body[1] - body[0] + ACROSS_STEP : null)));
  const points = guide.map(({ point: [x, y], normal: [nx, ny] }, i) => [x + nx * centre[i], y + ny * centre[i]]);
  const streakSpans = scans.map(({ others }, i) =>
    others.map(([a, b]) => ({ offset: (a + b) / 2 - centre[i], width: b - a + ACROSS_STEP })),
  );
  return { points, centre, width, streakSpans };
}

function fillGaps(values) {
  const known = values.flatMap((value, i) => (value === null ? [] : [i]));
  return values.map((value, i) => {
    if (value !== null) return value;
    const before = known.filter((k) => k < i).pop();
    const after = known.find((k) => k > i);
    if (before === undefined) return values[after];
    if (after === undefined) return values[before];
    return values[before] + ((values[after] - values[before]) * (i - before)) / (after - before);
  });
}

/** Fewest samples a streak must span to count, so specks of ink aren't streaks. */
const MIN_STREAK_SAMPLES = 3;
/** Furthest a streak's offset may move from one sample to the next. */
const MAX_STREAK_JUMP = 2;

/** Joins streak spans sample to sample into streaks, as [from, to] sample indices. */
function trackStreaks(streakSpans) {
  const open = [];
  const done = [];
  streakSpans.forEach((spans, i) => {
    for (const span of spans) {
      const track = open.find(
        (t) => t.last === i - 1 && Math.abs(t.spans[t.spans.length - 1].offset - span.offset) <= MAX_STREAK_JUMP,
      );
      if (track) {
        track.spans.push(span);
        track.last = i;
      } else open.push({ first: i, last: i, spans: [span] });
    }
    for (const track of open.filter((t) => t.last < i)) done.push(...open.splice(open.indexOf(track), 1));
  });
  return [...done, ...open]
    .filter((track) => track.spans.length >= MIN_STREAK_SAMPLES)
    .map(({ first, last, spans }) => ({
      first,
      last,
      offset: median(spans.map((s) => s.offset)),
      width: Math.max(...spans.map((s) => s.width)),
    }));
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const smooth = (values, radius) =>
  values.map((_, i) => {
    const window = values.slice(Math.max(0, i - radius), i + radius + 1);
    return window.reduce((sum, v) => sum + v, 0) / window.length;
  });

// --- Fitting ------------------------------------------------------------------

/** Least-squares circle through points (Kåsa's fit). */
function fitCircle(points) {
  // Solve for x² + y² + Dx + Ey + F = 0.
  const sums = Array.from({ length: 3 }, () => [0, 0, 0, 0]);
  for (const [x, y] of points) {
    const row = [x, y, 1];
    const rhs = -(x * x + y * y);
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) sums[r][c] += row[r] * row[c];
      sums[r][3] += row[r] * rhs;
    }
  }
  const [D, E, F] = solve(sums);
  const [cx, cy] = [-D / 2, -E / 2];
  return { centre: [cx, cy], radius: Math.sqrt(cx * cx + cy * cy - F) };
}

/** Gaussian elimination on an augmented n×(n+1) matrix. */
function solve(matrix) {
  const m = matrix.map((row) => [...row]);
  const n = m.length;
  for (let c = 0; c < n; c++) {
    const pivot = m.slice(c).reduce((best, row, i) => (Math.abs(row[c]) > Math.abs(m[best][c]) ? c + i : best), c);
    [m[c], m[pivot]] = [m[pivot], m[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const factor = m[r][c] / m[c][c];
      for (let k = c; k <= n; k++) m[r][k] -= factor * m[c][k];
    }
  }
  return m.map((row, i) => row[n] / row[i]);
}

/** Least-squares line through points, as a point on it and a unit direction. */
function fitLine(points) {
  const [mx, my] = [0, 1].map((k) => points.reduce((sum, p) => sum + p[k], 0) / points.length);
  let [sxx, sxy, syy] = [0, 0, 0];
  for (const [x, y] of points) {
    sxx += (x - mx) ** 2;
    sxy += (x - mx) * (y - my);
    syy += (y - my) ** 2;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { through: [mx, my], direction: [Math.cos(angle), Math.sin(angle)] };
}

function intersect(a, b) {
  const [[x1, y1], [dx1, dy1]] = [a.through, a.direction];
  const [[x2, y2], [dx2, dy2]] = [b.through, b.direction];
  const t = ((x2 - x1) * dy2 - (y2 - y1) * dx2) / (dx1 * dy2 - dy1 * dx2);
  return [x1 + dx1 * t, y1 + dy1 * t];
}

// --- Guides -----------------------------------------------------------------

const ALONG_STEP = 1;

/** Samples every ALONG_STEP along a straight line, from `from` to `to`. */
function lineGuide(from, to) {
  const length = distance(from, to);
  const [ux, uy] = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
  const steps = Math.round(length / ALONG_STEP);
  return Array.from({ length: steps + 1 }, (_, i) => ({
    point: [from[0] + ux * length * (i / steps), from[1] + uy * length * (i / steps)],
    normal: [-uy, ux],
  }));
}

/** Samples clockwise (on screen) around a circle, from `fromDeg` to `toDeg`. */
function arcGuide({ centre: [cx, cy], radius }, fromDeg, toDeg, stepDeg) {
  const steps = Math.round((toDeg - fromDeg) / stepDeg);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = ((fromDeg + stepDeg * i) * Math.PI) / 180;
    // Clockwise, the right of the drawing direction is towards the centre.
    return { point: [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)], normal: [-Math.cos(angle), -Math.sin(angle)] };
  });
}

/**
 * Where the ink runs out, heading from `from` in `direction`. It follows the ink
 * sideways as it goes, since a stroke thins towards one of its edges.
 */
function inkEnd(from, direction) {
  const [maxGap, maxDrift, step] = [3, 0.03 * size, 0.5];
  const normal = [-direction[1], direction[0]];
  let [end, gap, drift] = [from, 0, 0];
  for (let d = 0; gap <= maxGap; d += step) {
    const centre = [from[0] + direction[0] * d, from[1] + direction[1] * d];
    const inked = [];
    // Past the first step, follow the ink at most about 30° off course.
    const reach = d === 0 ? maxDrift : step * 0.6;
    for (let o = drift - reach; o <= drift + reach; o += 0.25) {
      const inkedAt = darknessAt(centre[0] + normal[0] * o, centre[1] + normal[1] * o) > 0.5;
      if (Math.abs(o) <= maxDrift && inkedAt) inked.push(o);
    }
    if (inked.length === 0) {
      gap += step;
      continue;
    }
    drift = (inked[0] + inked[inked.length - 1]) / 2;
    [end, gap] = [[centre[0] + normal[0] * drift, centre[1] + normal[1] * drift], 0];
  }
  return end;
}

// --- The circle ---------------------------------------------------------------

const inkPoints = [];
for (let y = 0; y < image.height; y++)
  for (let x = 0; x < image.width; x++)
    if (image.darkness[y * image.width + x] > 0.5 && Math.hypot(x - size / 2, y - size / 2) > size * 0.38) inkPoints.push([x, y]);
const ring = fitCircle(inkPoints);
// Offsets are towards the centre: the tail's dry streaks reach further outside.
const CIRCLE_BAND = [-0.12 * ring.radius, 0.09 * ring.radius];
const DEG_STEP = 1;

/** Spans of ink across the circle at an angle, from outside in. */
const circleSpansAt = (deg) => {
  const [{ point, normal }] = arcGuide(ring, deg, deg, DEG_STEP);
  return spansAcross(point, normal, CIRCLE_BAND);
};

// Where the brush sets down: after the hairline down the right side, the first
// angle where the stroke is heavy again.
const circleWidthAt = (deg) => {
  const inner = circleSpansAt(deg).at(-1);
  return inner ? inner[1] - inner[0] : 0;
};
let startDeg = -60;
while (circleWidthAt(startDeg) > 0.02 * ring.radius || circleWidthAt(startDeg + 1) < 0.03 * ring.radius) startDeg += 1;

// The stroke ends as a hairline over its own start, with a few dry streaks just
// outside the circle: it ends with the last of them.
const outerStreaksAt = (deg) => circleSpansAt(deg).length > 1;
let endDeg = startDeg + 360;
for (let deg = startDeg; deg < startDeg + 45; deg += DEG_STEP) if (outerStreaksAt(deg)) endDeg = deg + 360 + DEG_STEP;

const circleGuide = arcGuide(ring, startDeg, endDeg, DEG_STEP);
const tailFrom = Math.round(360 / DEG_STEP);
// The heavy start and the tail overlap: the tail's streaks are read where the start is,
// and its hairline is hidden under the start.
const circleScan = scanStroke(
  circleGuide.map((sample, i) => (i >= tailFrom ? circleGuide[i - tailFrom] : sample)),
  { band: CIRCLE_BAND, keel: 1 },
);
const lastHairline = tailFrom - 1;
const tailLength = circleGuide.length - tailFrom;
const circle = {
  points: circleScan.points.map((point, i) => {
    if (i < tailFrom) return point;
    // Carry on round at the hairline's distance from the centre.
    const { point: [x, y], normal: [nx, ny] } = circleGuide[i];
    return [x + nx * circleScan.centre[lastHairline], y + ny * circleScan.centre[lastHairline]];
  }),
  width: circleScan.width.map((w, i) =>
    i < tailFrom ? w : circleScan.width[lastHairline] * (1 - (i - tailFrom + 1) / (tailLength + 1)),
  ),
  // Streaks outside the circle where the stroke starts belong to its tail, beside its hairline.
  streakSpans: circleScan.streakSpans.map((spans, i) =>
    i < tailFrom
      ? i < tailLength
        ? []
        : spans
      : spans.map((span) => ({ ...span, offset: span.offset + circleScan.centre[i] - circleScan.centre[lastHairline] })),
  ),
};

// --- The triangle -------------------------------------------------------------

// Rough corners, as fractions of the image, only to know where to look: the
// sides are then fitted to the ink.
const ROUGH = { bottomRight: [0.83, 0.7], apex: [0.51, 0.16], bottomLeft: [0.24, 0.7] };
const inImage = ([fx, fy]) => [fx * size, fy * size];
const TRIANGLE_BAND = [-0.07 * size, 0.07 * size];

/** Fits a line to the body's centre over the clean middle of a rough guide. */
function fitSide(from, to, keel) {
  const scan = scanStroke(lineGuide(from, to), { band: TRIANGLE_BAND, keel, occluded: [[0, 0.2], [0.75, 1]] });
  return fitLine(scan.points.slice(Math.round(scan.points.length * 0.2), Math.round(scan.points.length * 0.75)));
}
const rightSide = fitSide(inImage(ROUGH.bottomRight), inImage(ROUGH.apex), -1);
const leftSide = fitSide(inImage(ROUGH.apex), inImage(ROUGH.bottomLeft), -1);
const base = fitSide(inImage(ROUGH.bottomRight), inImage(ROUGH.bottomLeft), 1);

// Near its corners, a side runs into the circle and the other sides.
const CORNER = 0.07 * size;
const apex = intersect(rightSide, leftSide);
const bottomRight = intersect(rightSide, base);
const bottomLeftCrossing = intersect(leftSide, base);
const unit = ([x, y]) => [x / Math.hypot(x, y), y / Math.hypot(x, y)];
const towards = (from, to) => unit([to[0] - from[0], to[1] - from[1]]);
// Follow each stroke from the clean stretch before the bottom-left corner.
const before = (corner, direction) => [corner[0] - direction[0] * CORNER * 2, corner[1] - direction[1] * CORNER * 2];
const leftEnd = inkEnd(before(bottomLeftCrossing, towards(apex, bottomLeftCrossing)), towards(apex, bottomLeftCrossing));
const baseEnd = inkEnd(before(bottomLeftCrossing, towards(bottomRight, bottomLeftCrossing)), towards(bottomRight, bottomLeftCrossing));

/** Where `point` falls along the guide from `from` to `to`, as a fraction. */
const fractionAlong = (from, to, point) =>
  ((point[0] - from[0]) * (to[0] - from[0]) + (point[1] - from[1]) * (to[1] - from[1])) / ((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2);
const nearCorner = (from, to, corner, reach = CORNER) => {
  const f = fractionAlong(from, to, corner);
  const margin = reach / distance(from, to);
  return [f - margin, f + margin];
};
// The sides set down a little past the corner, filling it out to the circle.
const sidesStart = [bottomRight[0] - towards(bottomRight, apex)[0] * CORNER / 4, bottomRight[1] - towards(bottomRight, apex)[1] * CORNER / 4];
const baseStart = bottomRight;

/**
 * Scans the triangle's stroke from `from` to `to`. Near the `occluded` corners
 * another stroke hides it; near the `crossed` ones, as [corner, reach], a thin
 * one crosses it.
 */
function scanTriangle(from, to, keel, { occluded = [], crossed = [] }) {
  return scanStroke(lineGuide(from, to), {
    band: TRIANGLE_BAND,
    keel,
    occluded: occluded.map((corner) => nearCorner(from, to, corner)),
    crossed: crossed.map(([corner, reach]) => nearCorner(from, to, corner, reach)),
  });
}
const rightScan = scanTriangle(sidesStart, apex, -1, { occluded: [bottomRight, apex] });
const leftScan = scanTriangle(apex, leftEnd, -1, {
  occluded: [apex],
  // At the bottom left, only the base's hairline and the side's dry end cross.
  crossed: [[bottomLeftCrossing, CORNER / 2]],
});
const baseScan = scanTriangle(baseStart, baseEnd, 1, {
  occluded: [bottomRight],
  // The heavier side reaches further across the base.
  crossed: [[bottomLeftCrossing, CORNER]],
});

// --- Printing -----------------------------------------------------------------

const SCALE = 100 / size;
const toLogo = ([x, y]) => [(x - ring.centre[0]) * SCALE + 50, (y - ring.centre[1]) * SCALE + 50];
const roundTo = (value, digits = 1) => Number(value.toFixed(digits));

/** Distances along a polyline, as fractions of its length. */
function fractions(points) {
  const distances = [0];
  for (let i = 1; i < points.length; i++) distances.push(distances[i - 1] + distance(points[i - 1], points[i]));
  return distances.map((d) => d / distances[distances.length - 1]);
}

/** Drops profile points that a straight line through their neighbours already gives, within `tolerance`. */
function simplify(profile, tolerance) {
  if (profile.length <= 2) return profile;
  const [first, last] = [profile[0], profile[profile.length - 1]];
  let [worst, worstAt] = [0, 0];
  profile.forEach(([p, v], i) => {
    const expected = first[1] + ((last[1] - first[1]) * (p - first[0])) / (last[0] - first[0]);
    if (Math.abs(v - expected) > worst) [worst, worstAt] = [Math.abs(v - expected), i];
  });
  if (worst <= tolerance) return [first, last];
  return [...simplify(profile.slice(0, worstAt + 1), tolerance).slice(0, -1), ...simplify(profile.slice(worstAt), tolerance)];
}

/**
 * Turns a stroke's scans, one per run of its centre line (joined at sharp
 * turns), into its data: the centre line every `every` samples, its width
 * profile and its streaks.
 */
function strokeData(scans, every) {
  const smoothRuns = scans.map(({ points, width, streakSpans }) => ({
    points: [0, 1].map((k) => smooth(points.map((p) => p[k]), 2)).reduce((xs, ys) => xs.map((x, i) => [x, ys[i]])),
    width: smooth(width, 1),
    streakSpans,
  }));
  // Each run starts exactly where the previous one ends, at the sharp turn between them.
  for (let r = 1; r < smoothRuns.length; r++) {
    const [end, start] = [smoothRuns[r - 1].points.at(-1), smoothRuns[r].points[0]];
    const turn = [(end[0] + start[0]) / 2, (end[1] + start[1]) / 2];
    smoothRuns[r - 1].points[smoothRuns[r - 1].points.length - 1] = turn;
    smoothRuns[r].points[0] = turn;
  }
  const allPoints = smoothRuns.flatMap(({ points }, r) => (r === 0 ? points : points.slice(1)));
  const along = fractions(allPoints);
  const width = smoothRuns.flatMap(({ width }, r) => (r === 0 ? width : width.slice(1)));
  const streakSpans = smoothRuns.flatMap(({ streakSpans }, r) => (r === 0 ? streakSpans : streakSpans.slice(1)));
  const centreLine = smoothRuns.map(({ points }) =>
    points.filter((_, i) => i % every === 0 || i === points.length - 1).map((p) => toLogo(p).map((v) => roundTo(v))),
  );
  const streaks = trackStreaks(streakSpans).map(({ first, last, offset, width }) => ({
    from: roundTo(along[first], 3),
    to: roundTo(along[Math.min(along.length - 1, last + 1)], 3),
    offset: roundTo(offset * SCALE, 2),
    width: roundTo(width * SCALE, 2),
  }));
  return {
    centreLine,
    width: simplify(width.map((w, i) => [along[i], w * SCALE]), 0.15).map(([p, w]) => [roundTo(p, 3), roundTo(w, 2)]),
    dryBrush: streaks.sort((a, b) => a.from - b.from),
  };
}

const format = (name, comment, { centreLine, width, dryBrush }) => `${comment}
export const ${name}: Stroke = {
  centreLine: [
${centreLine.map((run) => `    [${run.map(([x, y]) => `[${x}, ${y}]`).join(', ')}],`).join('\n')}
  ],
  width: [${width.map(([p, w]) => `[${p}, ${w}]`).join(', ')}],
  dryBrush: [
${dryBrush.map((s) => `    { from: ${s.from}, to: ${s.to}, offset: ${s.offset}, width: ${s.width} },`).join('\n')}
  ],
};`;

/** Centre of the circle inscribed in the triangle (its offset edges share it), where the round number sits. */
function incentre(a, b, c) {
  const [la, lb, lc] = [distance(b, c), distance(a, c), distance(a, b)];
  const sum = la + lb + lc;
  return [0, 1].map((k) => (la * a[k] + lb * b[k] + lc * c[k]) / sum);
}
const triangleCentre = toLogo(incentre(apex, bottomRight, bottomLeftCrossing)).map((v) => roundTo(v));

const point = (p) => p.map((v) => roundTo(v)).join(', ');
console.error(`circle: centre ${point(ring.centre)}, radius ${roundTo(ring.radius)}, from ${startDeg}° to ${endDeg}°`);
console.error(`triangle: apex ${point(apex)}, bottom right ${point(bottomRight)}`);
console.error(`ends: left side ${point(leftEnd)}, base ${point(baseEnd)}`);
console.log(`/**
 * The school's mark as brush strokes, in a 100×100 box: one circle and one
 * triangle. Order and direction matter: the triangle redraw and the hold trace
 * follow the strokes as the brush drew them. First measured from the reference
 * image by scripts/measure-mark.mjs; edit by hand from here (see \`Stroke\`).
 */

import type { Point, Stroke } from './brush';

${[
  format(
    'CIRCLE',
    [
      "// One stroke, clockwise. The brush sets down just past three o'clock and is",
      "// heavy by about four o'clock. It goes dry at about one o'clock and ends as a",
      '// hairline over its own start, with dry streaks outside the circle.',
    ].join('\n'),
    strokeData([circle], 6),
  ),
  format(
    'TRIANGLE_APEX_STROKE',
    [
      '// Up the right side from the bottom-right corner, a sharp turn at the apex, then',
      '// down the left side, going dry with streaks on its outer edge.',
    ].join('\n'),
    strokeData([rightScan, leftScan], 12),
  ),
  format(
    'TRIANGLE_BASE_STROKE',
    [
      '// After a brush lift, right to left: heavy from the bottom-right corner, going dry,',
      '// ending in a hairline past the bottom-left corner.',
    ].join('\n'),
    strokeData([baseScan], 12),
  ),
].join('\n\n')}

/** The triangle's strokes, in drawing order, with a brush lift between them. */
export const TRIANGLE_STROKES: Stroke[] = [TRIANGLE_APEX_STROKE, TRIANGLE_BASE_STROKE];

/** The whole mark's strokes, in drawing order. */
export const MARK: Stroke[] = [CIRCLE, ...TRIANGLE_STROKES];

/** Centre of the circle inscribed in the triangle: where the round number sits. */
export const TRIANGLE_CENTRE: Point = [${triangleCentre.join(', ')}];`);
