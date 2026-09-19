import { createScreenGesture, holdProgress, HOLD_TO_STOP_MS } from './screenGesture';

function setup(running: boolean) {
  const state = { running };
  const onStart = jest.fn(() => {
    state.running = true;
  });
  const onStop = jest.fn(() => {
    state.running = false;
  });
  const onHoldChange = jest.fn();
  const gesture = createScreenGesture({ isRunning: () => state.running, onStart, onStop, onHoldChange });
  return { gesture, onStart, onStop, onHoldChange };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('screen gesture while idle', () => {
  it('starts a session when a tap is released', () => {
    const { gesture, onStart } = setup(false);
    gesture.pressIn();
    gesture.pressOut();
    expect(onStart).not.toHaveBeenCalled();
    gesture.tap();
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('does not start a session when the touch is cancelled rather than released', () => {
    // e.g. pulling down Control Center: the press goes out without a tap.
    const { gesture, onStart } = setup(false);
    gesture.pressIn();
    gesture.pressOut();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('starts a session even after a long press, and never stops it', () => {
    const { gesture, onStart, onStop } = setup(false);
    gesture.pressIn();
    jest.advanceTimersByTime(HOLD_TO_STOP_MS * 2);
    gesture.pressOut();
    gesture.tap();
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();
  });

  it('never holds', () => {
    const { gesture, onHoldChange } = setup(false);
    gesture.pressIn();
    jest.advanceTimersByTime(HOLD_TO_STOP_MS);
    gesture.pressOut();
    gesture.tap();
    expect(onHoldChange).not.toHaveBeenCalled();
  });
});

describe('screen gesture while running', () => {
  it('ignores a plain tap', () => {
    const { gesture, onStart, onStop } = setup(true);
    gesture.pressIn();
    jest.advanceTimersByTime(100);
    gesture.pressOut();
    gesture.tap();
    jest.advanceTimersByTime(HOLD_TO_STOP_MS);
    expect(onStart).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
  });

  it('stops the session once held for the full hold, without waiting for release', () => {
    const { gesture, onStop } = setup(true);
    gesture.pressIn();
    jest.advanceTimersByTime(HOLD_TO_STOP_MS - 1);
    expect(onStop).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('does not start a new session when the completed hold is released', () => {
    const { gesture, onStart, onStop } = setup(true);
    gesture.pressIn();
    jest.advanceTimersByTime(HOLD_TO_STOP_MS);
    gesture.pressOut();
    gesture.tap();
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('cancels the stop when released early, and a new hold starts from zero', () => {
    const { gesture, onStop } = setup(true);
    gesture.pressIn();
    jest.advanceTimersByTime(HOLD_TO_STOP_MS - 100);
    gesture.pressOut();
    jest.advanceTimersByTime(HOLD_TO_STOP_MS);
    expect(onStop).not.toHaveBeenCalled();

    gesture.pressIn();
    jest.advanceTimersByTime(HOLD_TO_STOP_MS - 1);
    expect(onStop).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('does not stop again when the session already ended during the hold', () => {
    // e.g. leaving the app mid-hold stops the session on its own.
    const state = { running: true };
    const onStop = jest.fn();
    const gesture = createScreenGesture({ isRunning: () => state.running, onStart: jest.fn(), onStop, onHoldChange: jest.fn() });
    gesture.pressIn();
    state.running = false;
    jest.advanceTimersByTime(HOLD_TO_STOP_MS);
    expect(onStop).not.toHaveBeenCalled();
  });

  it('abandons a pending hold when disposed', () => {
    const { gesture, onStop } = setup(true);
    gesture.pressIn();
    gesture.dispose();
    jest.advanceTimersByTime(HOLD_TO_STOP_MS);
    expect(onStop).not.toHaveBeenCalled();
  });

  it('reports the hold from press-in until completion, for the hold trace', () => {
    const { gesture, onStop, onHoldChange } = setup(true);
    gesture.pressIn();
    expect(onHoldChange.mock.calls).toEqual([[true]]);
    onHoldChange.mockImplementation(() => expect(onStop).not.toHaveBeenCalled());
    jest.advanceTimersByTime(HOLD_TO_STOP_MS);
    expect(onHoldChange.mock.calls).toEqual([[true], [false]]);
    gesture.pressOut();
    expect(onHoldChange).toHaveBeenCalledTimes(2);
  });

  it('reports the hold ending when released early', () => {
    const { gesture, onHoldChange } = setup(true);
    gesture.pressIn();
    jest.advanceTimersByTime(HOLD_TO_STOP_MS / 2);
    gesture.pressOut();
    expect(onHoldChange.mock.calls).toEqual([[true], [false]]);
  });
});

describe('hold progress', () => {
  it('runs from nothing at press-in to the full hold at HOLD_TO_STOP_MS', () => {
    expect(holdProgress(0)).toBe(0);
    expect(holdProgress(HOLD_TO_STOP_MS / 4)).toBeCloseTo(0.25);
    expect(holdProgress(HOLD_TO_STOP_MS)).toBe(1);
  });

  it('stays within the hold', () => {
    expect(holdProgress(-10)).toBe(0);
    expect(holdProgress(HOLD_TO_STOP_MS * 2)).toBe(1);
  });
});
