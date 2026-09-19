import { CIRCLE_STROKES, TRIANGLE_STROKES, traceStroke, type Point } from './strokes';

// Total angle (degrees) the points turn through around `centre`, signed:
// positive is clockwise on screen, where y grows downwards.
function sweptDegrees(points: Point[], [cx, cy]: Point) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = Math.atan2(points[i - 1][1] - cy, points[i - 1][0] - cx);
    const b = Math.atan2(points[i][1] - cy, points[i][0] - cx);
    let delta = b - a;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    total += delta;
  }
  return (total * 180) / Math.PI;
}

const LOGO_CENTRE: Point = [50, 50];

const first = (points: Point[]) => points[0];
const last = (points: Point[]) => points[points.length - 1];

// Which way the brush travels from the first point to the last, as seen on screen.
function heading(points: Point[]) {
  const [x0, y0] = first(points);
  const [x1, y1] = last(points);
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (Math.abs(dy) < Math.abs(dx) / 4) return dx > 0 ? 'right' : 'left';
  return `${dy > 0 ? 'down' : 'up'}-${dx > 0 ? 'right' : 'left'}`;
}


describe('logo circles', () => {
  it('are each one continuous brush path that runs past its own start', () => {
    expect(CIRCLE_STROKES).toHaveLength(2);
    for (const stroke of CIRCLE_STROKES) {
      const { d, points } = traceStroke(stroke);
      expect(d.match(/M/g)).toHaveLength(1);
      expect(sweptDegrees(points, LOGO_CENTRE)).toBeGreaterThan(365);
    }
  });

  it('press harder over part of their length by retracing their own brush path', () => {
    for (const stroke of CIRCLE_STROKES) {
      const { d, passes } = traceStroke(stroke);
      const heavier = passes.filter((pass) => pass.width > stroke.width);
      expect(heavier.length).toBeGreaterThan(0);
      for (const pass of heavier) {
        expect(pass.d.length).toBeLessThan(d.length);
        expect(d).toContain(pass.d.slice(pass.d.indexOf('L')));
      }
    }
  });
});

describe('logo triangle', () => {
  const traced = TRIANGLE_STROKES.map((stroke) => traceStroke(stroke).points);

  it('is drawn outer triangle first, then inner, each as left fall, right fall, base', () => {
    expect(traced.map(heading)).toEqual([
      'down-left', // outer left fall
      'down-left', // tail
      'down-right', // outer right fall
      'right', // outer base
      'down-left', // inner left fall
      'down-right', // inner right fall
      'right', // inner base
    ]);
  });

  it('starts both falls of each triangle from its apex', () => {
    const [outerLeft, , outerRight, , innerLeft, innerRight] = traced;
    expect(first(outerLeft)).toEqual(first(outerRight));
    expect(first(innerLeft)).toEqual(first(innerRight));
    expect(first(innerLeft)[1]).toBeGreaterThan(first(outerLeft)[1]);
  });

  it('has a short tail flicking past the bottom-left corner', () => {
    const [outerLeft, tail] = traced;
    const [tailX, tailY] = last(tail);
    const [cornerX, cornerY] = last(outerLeft);
    expect(Math.hypot(tailX - first(tail)[0], tailY - first(tail)[1])).toBeLessThan(10);
    expect(tailX).toBeLessThan(cornerX);
    expect(tailY).toBeGreaterThan(cornerY);
  });
});
