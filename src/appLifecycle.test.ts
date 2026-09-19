import { keepsSessionRunning } from './appLifecycle';

describe('app lifecycle', () => {
  it('keeps the session running while the app is active', () => {
    expect(keepsSessionRunning('active')).toBe(true);
  });

  it.each(['inactive', 'background', 'unknown', 'extension'] as const)(
    'stops the session when the app becomes %s',
    (state) => {
      expect(keepsSessionRunning(state)).toBe(false);
    },
  );
});
