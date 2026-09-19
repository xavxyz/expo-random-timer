import { inkStroke, widthAt, type Point, type Stroke } from './brush';
import { CIRCLE, MARK, TRIANGLE_BASE_STROKE, TRIANGLE_CENTRE, TRIANGLE_APEX_STROKE, TRIANGLE_STROKES } from './strokes';

const LOGO_CENTRE: Point = [50, 50];

/** Clockwise angle on screen from three o'clock, in degrees from 0 to 360. */
function clockAngle([x, y]: Point) {
  const degrees = (Math.atan2(y - LOGO_CENTRE[1], x - LOGO_CENTRE[0]) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

/** Total angle the points turn through around the logo's centre; positive is clockwise on screen. */
function sweptDegrees(points: Point[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    let delta = clockAngle(points[i]) - clockAngle(points[i - 1]);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    total += delta;
  }
  return total;
}

/** The point of the centre line (joined straight) at a fraction of its length. */
function pointAt(stroke: Stroke, fraction: number): Point {
  const points = stroke.centreLine.flat();
  const lengths = points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
  let remaining = fraction * lengths.reduce((sum, l) => sum + l, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i]) {
      const t = remaining / lengths[i];
      return [points[i][0] + (points[i + 1][0] - points[i][0]) * t, points[i][1] + (points[i + 1][1] - points[i][1]) * t];
    }
    remaining -= lengths[i];
  }
  return points[points.length - 1];
}

const heaviest = (stroke: Stroke) => Math.max(...stroke.width.map(([, width]) => width));
const first = (stroke: Stroke) => stroke.centreLine[0][0];
const last = (stroke: Stroke) => stroke.centreLine.at(-1)!.at(-1)!;

describe('the circle', () => {
  it("is one heavy stroke, clockwise once round, heavy from about four o'clock", () => {
    expect(CIRCLE.centreLine).toHaveLength(1);
    // The brush sets down just past three o'clock and presses to full weight by about four.
    expect(clockAngle(first(CIRCLE))).toBeLessThan(15);
    const heavyFrom = CIRCLE.width.find(([, width]) => width > 4.5)![0];
    expect(clockAngle(pointAt(CIRCLE, heavyFrom))).toBeGreaterThan(20);
    expect(clockAngle(pointAt(CIRCLE, heavyFrom))).toBeLessThan(45);
    expect(sweptDegrees(CIRCLE.centreLine[0])).toBeGreaterThan(360);
    expect(sweptDegrees(CIRCLE.centreLine[0])).toBeLessThan(420);
    expect(heaviest(CIRCLE)).toBeGreaterThan(4);
    expect(heaviest(CIRCLE)).toBeLessThan(6);
  });

  it("goes dry at about one o'clock and ends as a hairline over its start, with dry streaks outside it", () => {
    const dryStarts = CIRCLE.dryBrush.map(({ from }) => clockAngle(pointAt(CIRCLE, from))).sort((a, b) => a - b);
    // Dry near one o'clock (300°), and again at the end, just past three o'clock.
    expect(dryStarts.some((angle) => angle > 280 && angle < 315)).toBe(true);
    expect(dryStarts.some((angle) => angle < 40)).toBe(true);
    // Streaks outside the circle: to the left of its clockwise drawing direction.
    for (const streak of CIRCLE.dryBrush) expect(streak.offset).toBeLessThan(0);
    // A hairline down the right side, from about two o'clock to the end.
    const hairline = [0.82, 0.9, 0.97].map((fraction) => ({
      angle: clockAngle(pointAt(CIRCLE, fraction)),
      width: widthAt(CIRCLE, fraction),
    }));
    for (const { width } of hairline) expect(width).toBeLessThan(1);
    expect(hairline[0].angle).toBeGreaterThan(300);
    expect(hairline[2].angle).toBeLessThan(40);
  });
});

describe('the triangle', () => {
  it('is two strokes: the sides, then the base', () => {
    expect(TRIANGLE_STROKES).toEqual([TRIANGLE_APEX_STROKE, TRIANGLE_BASE_STROKE]);
  });

  it('draws its sides up the right side from the bottom-right corner, then down the left, turning sharply at the apex', () => {
    const { turns } = inkStroke(TRIANGLE_APEX_STROKE);
    expect(turns).toHaveLength(1);
    const [rightSide, leftSide] = TRIANGLE_APEX_STROKE.centreLine;
    const apex = rightSide.at(-1)!;
    expect(leftSide[0]).toEqual(apex);
    // The apex is the top of the triangle, above its centre.
    expect(Math.min(...TRIANGLE_APEX_STROKE.centreLine.flat().map(([, y]) => y))).toBeCloseTo(apex[1], 0);
    expect(apex[0]).toBeCloseTo(50, -1);
    // Up and to the left, then down and to the left.
    expect(rightSide[0][0]).toBeGreaterThan(apex[0]);
    expect(rightSide[0][1]).toBeGreaterThan(apex[1]);
    expect(leftSide.at(-1)![0]).toBeLessThan(apex[0]);
    expect(leftSide.at(-1)![1]).toBeGreaterThan(apex[1]);
    // The right side is the heaviest line of the mark; the left side goes dry near its bottom.
    for (const other of [CIRCLE, TRIANGLE_BASE_STROKE]) {
      expect(heaviest(TRIANGLE_APEX_STROKE)).toBeGreaterThanOrEqual(heaviest(other));
    }
    expect(TRIANGLE_APEX_STROKE.dryBrush.some(({ from }) => from > inkStroke(TRIANGLE_APEX_STROKE).turns[0])).toBe(true);
    expect(widthAt(TRIANGLE_APEX_STROKE, 1)).toBeLessThan(1);
  });

  it('draws its base right to left, from heavy to a hairline past the bottom-left corner', () => {
    expect(last(TRIANGLE_BASE_STROKE)[0]).toBeLessThan(first(TRIANGLE_BASE_STROKE)[0]);
    expect(Math.abs(last(TRIANGLE_BASE_STROKE)[1] - first(TRIANGLE_BASE_STROKE)[1])).toBeLessThan(5);
    expect(widthAt(TRIANGLE_BASE_STROKE, 0)).toBeGreaterThan(4);
    expect(widthAt(TRIANGLE_BASE_STROKE, 1)).toBeLessThan(1);
    expect(TRIANGLE_BASE_STROKE.dryBrush.length).toBeGreaterThan(0);
    // Past the corner where the left side crosses it.
    const leftSide = TRIANGLE_APEX_STROKE.centreLine[1];
    const baseY = last(TRIANGLE_BASE_STROKE)[1];
    const [above, below] = [leftSide.filter(([, y]) => y < baseY).at(-1)!, leftSide.find(([, y]) => y >= baseY)!];
    const cornerX = above[0] + ((below[0] - above[0]) * (baseY - above[1])) / (below[1] - above[1]);
    expect(last(TRIANGLE_BASE_STROKE)[0]).toBeLessThan(cornerX);
  });
});

describe('the mark', () => {
  it('is the circle, then the triangle', () => {
    expect(MARK).toEqual([CIRCLE, TRIANGLE_APEX_STROKE, TRIANGLE_BASE_STROKE]);
  });

  it("has the round number's place inside the triangle, below the apex and above the base", () => {
    const [x, y] = TRIANGLE_CENTRE;
    const apex = TRIANGLE_APEX_STROKE.centreLine[0].at(-1)!;
    expect(x).toBeCloseTo(apex[0], 0);
    expect(y).toBeGreaterThan(apex[1] + 20);
    expect(y).toBeLessThan(first(TRIANGLE_BASE_STROKE)[1] - 10);
  });

  it('inks the same every time', () => {
    for (const stroke of MARK) {
      expect(inkStroke(stroke).inkUpTo(1)).toBe(inkStroke(stroke).inkUpTo(1));
    }
  });
});
