import { createScreenGesture, HOLD_TO_STOP_MS } from './screenGesture';

function setup(running: boolean) {
  const state = { running };
  const onStart = jest.fn(() => {
    state.running = true;
  });
  const onStop = jest.fn(() => {
    state.running = false;
  });
  const gesture = createScreenGesture({ isRunning: () => state.running, onStart, onStop });
  return { gesture, onStart, onStop };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('screen gesture while idle', () => {
  it('starts a session when a tap is released', () => {
    const { gesture, onStart } = setup(false);
    gesture.pressIn();
    expect(onStart).not.toHaveBeenCalled();
    gesture.pressOut();
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('starts a session even after a long press, and never stops it', () => {
    const { gesture, onStart, onStop } = setup(false);
    gesture.pressIn();
    jest.advanceTimersByTime(HOLD_TO_STOP_MS * 2);
    gesture.pressOut();
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();
  });
});

describe('screen gesture while running', () => {
  it('ignores a plain tap', () => {
    const { gesture, onStart, onStop } = setup(true);
    gesture.pressIn();
    jest.advanceTimersByTime(100);
    gesture.pressOut();
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

  it('abandons a pending hold when disposed', () => {
    const { gesture, onStop } = setup(true);
    gesture.pressIn();
    gesture.dispose();
    jest.advanceTimersByTime(HOLD_TO_STOP_MS);
    expect(onStop).not.toHaveBeenCalled();
  });
});
