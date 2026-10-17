# Taiji Gong Random Timers

A calm phone timer for Taiji / gong fu training. It rings at hidden, random intervals and shows only the round number.

## Language

### The mark

**Mark**:
The school's hand-drawn emblem: one brush circle enclosing one brush triangle. The app no longer shows it on screen; its stroke data stays in `src/logo/`.
_Avoid_: Doubled circle, doubled triangle, inner/outer triangle

**Stroke**:
One continuous movement of the brush, from touching the paper to lifting off. It has a start, a direction and an end.
_Avoid_: Line, path, side (a stroke can span several sides)

**Dry brush**:
A stretch of a stroke where the brush is running out of ink, so the stroke splits into separate bristle streaks and thins out. It marks the stroke's end, not its start.
_Avoid_: Texture, scratch

**Brush lift**:
The moment between two strokes when the brush leaves the paper.

### The session

**Hold to stop**:
Holding anywhere on the screen until the session stops. Nothing on screen shows it: a haptic fires at its halfway point, and another as the stop lands.
