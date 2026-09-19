import { inkStroke, type Point, type Stroke } from './brush';

/** Every point of an SVG path's outline. */
function outlinePoints(d: string): Point[] {
  const numbers = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const points: Point[] = [];
  for (let i = 0; i < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]]);
  return points;
}

/** Whether an SVG path of closed outlines inks a point, under the non-zero fill rule. */
function inks(d: string, [px, py]: Point): boolean {
  let winding = 0;
  for (const outline of d.split('Z').map(outlinePoints)) {
    outline.forEach(([x0, y0], i) => {
      const [x1, y1] = outline[(i + 1) % outline.length];
      const side = (x1 - x0) * (py - y0) - (px - x0) * (y1 - y0);
      if (y0 <= py && y1 > py && side > 0) winding++;
      if (y0 > py && y1 <= py && side < 0) winding--;
    });
  }
  return winding !== 0;
}

const xs = (points: Point[]) => points.map(([x]) => x);
const ys = (points: Point[]) => points.map(([, y]) => y);

/** A stroke of even width along the given runs of centre line. */
function evenStroke(centreLine: Point[][], width = 2): Stroke {
  return { centreLine, width: [[0, width], [1, width]], dryBrush: [] };
}

describe('an inked stroke', () => {
  it('measures its length along the centre line and where the brush turns sharply', () => {
    const inked = inkStroke(
      evenStroke([
        [[0, 0], [10, 0]],
        [[10, 0], [10, 5]],
      ]),
    );
    expect(inked.length).toBeCloseTo(15);
    expect(inked.turns).toHaveLength(1);
    expect(inked.turns[0]).toBeCloseTo(10 / 15);
  });

  it('inks the whole stroke, as wide as its width', () => {
    const points = outlinePoints(inkStroke(evenStroke([[[0, 0], [10, 0]]])).inkUpTo(1));
    expect(Math.min(...xs(points))).toBeCloseTo(0);
    expect(Math.max(...xs(points))).toBeCloseTo(10);
    expect(Math.min(...ys(points))).toBeCloseTo(-1);
    expect(Math.max(...ys(points))).toBeCloseTo(1);
  });

  it('inks only up to a fraction of its length, in its drawing direction', () => {
    const rightwards = outlinePoints(inkStroke(evenStroke([[[0, 0], [10, 0]]])).inkUpTo(0.3));
    expect(Math.min(...xs(rightwards))).toBeCloseTo(0);
    expect(Math.max(...xs(rightwards))).toBeCloseTo(3);

    const leftwards = outlinePoints(inkStroke(evenStroke([[[10, 0], [0, 0]]])).inkUpTo(0.3));
    expect(Math.min(...xs(leftwards))).toBeCloseTo(7);
    expect(Math.max(...xs(leftwards))).toBeCloseTo(10);
  });

  it('inks nothing before the brush has moved', () => {
    expect(inkStroke(evenStroke([[[0, 0], [10, 0]]])).inkUpTo(0)).toBe('');
  });

  it('inks no further than the whole stroke', () => {
    const inked = inkStroke(evenStroke([[[0, 0], [10, 0]]]));
    expect(inked.inkUpTo(1.5)).toBe(inked.inkUpTo(1));
    expect(inked.inkUpTo(-0.5)).toBe('');
  });

  it('joins the points of a run with a smooth curve rather than straight lines', () => {
    // A round brush movement, measured every 45 degrees.
    const onCircle = Array.from({ length: 9 }, (_, i): Point => {
      const angle = (i * Math.PI) / 4;
      return [10 * Math.cos(angle), 10 * Math.sin(angle)];
    });
    const radii = outlinePoints(inkStroke(evenStroke([onCircle])).inkUpTo(1)).map(([x, y]) => Math.hypot(x, y));
    expect(Math.min(...radii)).toBeGreaterThan(8.8);
    expect(Math.max(...radii)).toBeLessThan(11.2);
  });

  it('keeps a sharp corner where the brush turns without lifting', () => {
    // Right, then down: the outer corner is up and to the right of the turn.
    const points = outlinePoints(
      inkStroke(
        evenStroke([
          [[0, 0], [10, 0]],
          [[10, 0], [10, 10]],
        ]),
      ).inkUpTo(1),
    );
    const nearestToCorner = Math.min(...points.map(([x, y]) => Math.hypot(x - 11, y + 1)));
    expect(nearestToCorner).toBeCloseTo(0);
    expect(Math.max(...xs(points))).toBeCloseTo(11);
    expect(Math.min(...ys(points))).toBeCloseTo(-1);
  });

  it('fills the inside of a sharp turn, even for a heavy stroke', () => {
    // Up to an apex and down again, as heavy as the mark's triangle and as sharp,
    // each side bending slightly as a brush does.
    const d = inkStroke(
      evenStroke(
        [
          [[-10, 20], [-4.5, 9.5], [0, 0]],
          [[0, 0], [4.5, 9.5], [10, 20]],
        ],
        5,
      ),
    ).inkUpTo(1);
    // Solid ink down from the apex, to where the inner edges meet, about 5 below it.
    for (const y of [-2, 0, 1, 2, 3, 4]) expect(inks(d, [0, y])).toBe(true);
    expect(inks(d, [0, 8])).toBe(false);
  });

  it('varies in width along its length', () => {
    const thinning: Stroke = { centreLine: [[[0, 0], [10, 0]]], width: [[0, 2], [1, 0.4]], dryBrush: [] };
    const points = outlinePoints(inkStroke(thinning).inkUpTo(1));
    const spreadAt = (x: number) => Math.max(...points.filter(([px]) => Math.abs(px - x) < 0.01).map(([, y]) => y));
    expect(spreadAt(0)).toBeCloseTo(1);
    expect(spreadAt(10)).toBeCloseTo(0.2);
  });

  describe('where the brush runs dry', () => {
    // Rightwards, with one streak in its second half, 3 to the right of the brush (below it on screen).
    const dry: Stroke = {
      centreLine: [[[0, 0], [20, 0]]],
      width: [[0, 2], [1, 2]],
      dryBrush: [{ from: 0.5, to: 1, offset: 3, width: 1 }],
    };
    const streakPoints = (fraction: number) =>
      outlinePoints(inkStroke(dry).inkUpTo(fraction)).filter(([, y]) => y > 1.5);

    it('splits off a bristle streak beside the stroke, tapering to its end', () => {
      const streak = streakPoints(1);
      expect(Math.min(...xs(streak))).toBeCloseTo(10);
      expect(Math.max(...xs(streak))).toBeCloseTo(20);
      expect(Math.min(...ys(streak))).toBeGreaterThan(2.4);
      expect(Math.max(...ys(streak))).toBeLessThan(3.6);
      const tip = streak.filter(([x]) => x > 19.99);
      expect(Math.max(...ys(tip)) - Math.min(...ys(tip))).toBeLessThan(0.05);
    });

    it('draws the streak only as far as the brush has reached', () => {
      expect(streakPoints(0.4)).toHaveLength(0);
      expect(Math.max(...xs(streakPoints(0.75)))).toBeCloseTo(15);
    });
  });
});
