/**
 * The school's mark as brush strokes, in a 100×100 box: one circle and one
 * triangle. Order and direction matter: the triangle redraw and the hold trace
 * follow the strokes as the brush drew them. First measured from the reference
 * image by scripts/measure-mark.mjs; edit by hand from here (see `Stroke`).
 */

import type { Point, Stroke } from './brush';

// One stroke, clockwise. The brush sets down just past three o'clock and is
// heavy by about four o'clock. It goes dry at about one o'clock and ends as a
// hairline over its own start, with dry streaks outside the circle.
export const CIRCLE: Stroke = {
  centreLine: [
    [[89.5, 51.4], [89.5, 54.8], [89.2, 59], [88.5, 63.2], [86.9, 67.2], [85, 71], [82.9, 74.8], [80.2, 78.2], [77.1, 81.2], [73.7, 83.8], [70, 86], [66.1, 87.8], [62, 89.3], [57.8, 90.3], [53.6, 90.8], [49.3, 91], [45, 90.7], [40.8, 90], [36.6, 88.8], [32.7, 87.1], [28.9, 85.1], [25.4, 82.6], [22.2, 79.8], [19.3, 76.7], [16.7, 73.3], [14.5, 69.7], [12.6, 65.9], [11.1, 61.9], [10.1, 57.8], [9.5, 53.5], [9.4, 49.3], [9.7, 45.1], [10.4, 40.9], [11.6, 36.8], [13.2, 32.8], [15.1, 29.1], [17.5, 25.5], [20.2, 22.2], [23.2, 19.2], [26.6, 16.5], [30.1, 14.2], [34, 12.3], [38, 10.7], [42.2, 9.7], [46.4, 9], [50.7, 8.8], [55, 9.1], [59.2, 10], [63, 12.1], [67, 13.6], [70.7, 15.6], [73.8, 18.4], [77, 21], [79.7, 24.2], [82.2, 27.5], [84.4, 30.9], [86.2, 34.6], [87.7, 38.5], [88.7, 42.5], [89.2, 46.6], [89.2, 50.7], [88.9, 54.8], [88.2, 58.8], [87.1, 62.8], [85.5, 66.6], [83.6, 70.2], [81.5, 73.3], [81.3, 73.6]],
  ],
  width: [[0, 0.92], [0.002, 1.36], [0.015, 1.73], [0.023, 2.68], [0.03, 2.65], [0.038, 3.8], [0.068, 3.75], [0.073, 3.98], [0.084, 4.91], [0.094, 5.18], [0.174, 4.92], [0.259, 5.16], [0.419, 5.03], [0.564, 5.65], [0.635, 5.35], [0.679, 5.54], [0.718, 5.18], [0.726, 2.7], [0.739, 2.46], [0.766, 2.42], [0.774, 1.42], [0.801, 1.42], [0.811, 0.52], [0.912, 0.49], [1, 0.02]],
  dryBrush: [
    { from: 0.723, to: 0.779, offset: -2.6, width: 2.18 },
    { from: 0.934, to: 0.949, offset: -3.19, width: 0.73 },
    { from: 0.941, to: 0.985, offset: -4.03, width: 0.56 },
  ],
};

// Up the right side from the bottom-right corner, a sharp turn at the apex, then
// down the left side, going dry with streaks on its outer edge.
export const TRIANGLE_SIDES: Stroke = {
  centreLine: [
    [[81.6, 72.4], [80.3, 70.2], [79, 67.9], [77.6, 65.6], [76.3, 63.3], [74.9, 61], [73.5, 58.6], [72.2, 56.3], [70.8, 54], [69.5, 51.7], [68.1, 49.4], [66.7, 47.1], [65.4, 44.7], [64, 42.4], [62.6, 40.1], [61.3, 37.8], [59.9, 35.5], [58.5, 33.2], [57.2, 30.8], [55.8, 28.5], [54.5, 26.2], [53.1, 23.9], [51.8, 21.6], [50.3, 19.4]],
    [[50.3, 19.4], [49, 21.6], [47.8, 24], [46.5, 26.3], [45.1, 28.6], [43.8, 30.9], [42.4, 33.3], [41.1, 35.6], [39.7, 37.9], [38.4, 40.2], [37.1, 42.5], [35.7, 44.9], [34.4, 47.2], [33, 49.5], [31.8, 51.9], [30.8, 54.4], [29.6, 56.8], [28.2, 59.1], [27.4, 61.7], [26.2, 64.1], [25.2, 66.6], [24.2, 69.1], [23.4, 70.4]],
  ],
  width: [[0, 5.65], [0.086, 5.65], [0.273, 5.09], [0.514, 5.26], [0.814, 4.87], [0.842, 4.68], [0.848, 4.03], [0.859, 3.8], [0.906, 3.95], [0.912, 2.87], [0.915, 2.76], [0.935, 2.83], [0.943, 2.11], [0.951, 1.81], [0.964, 1.77], [0.969, 2.13], [0.975, 1.62], [0.981, 0.56], [1, 0.34]],
  dryBrush: [
    { from: 0.846, to: 0.935, offset: 2.54, width: 0.73 },
    { from: 0.91, to: 0.92, offset: 3.08, width: 0.34 },
  ],
};

// After a brush lift, right to left: heavy from the bottom-right corner, going dry,
// ending in a hairline past the bottom-left corner.
export const TRIANGLE_BASE: Stroke = {
  centreLine: [
    [[80.6, 70.2], [78.2, 70.1], [75.5, 69.9], [72.8, 69.8], [70.1, 69.8], [67.5, 69.8], [64.8, 69.8], [62.1, 69.8], [59.4, 69.8], [56.7, 69.8], [54.1, 68.5], [51.4, 68.4], [48.7, 68.5], [46, 68.5], [43.4, 67.9], [40.7, 67.9], [38, 67.5], [35.3, 67.6], [32.6, 67.6], [29.9, 67.6], [27.2, 67.6], [24.6, 67.5], [21.9, 67.7], [21.2, 67.6]],
  ],
  width: [[0, 5.37], [0.414, 5.37], [0.43, 2.91], [0.44, 2.8], [0.589, 2.68], [0.601, 1.57], [0.702, 1.51], [0.713, 0.65], [0.717, 0.63], [0.914, 0.5], [0.952, 0.66], [1, 0.42]],
  dryBrush: [
    { from: 0.425, to: 0.597, offset: -2.74, width: 2.29 },
    { from: 0.597, to: 0.62, offset: -2.96, width: 0.95 },
  ],
};

/** The triangle's strokes, in drawing order, with a brush lift between them. */
export const TRIANGLE_STROKES: Stroke[] = [TRIANGLE_SIDES, TRIANGLE_BASE];

/** The whole mark's strokes, in drawing order. */
export const MARK: Stroke[] = [CIRCLE, ...TRIANGLE_STROKES];

/** Centre of the circle inscribed in the triangle: where the round number sits. */
export const TRIANGLE_CENTRE: Point = [50.6, 52.1];
