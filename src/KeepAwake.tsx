import { useKeepAwake } from 'expo-keep-awake';

/** Keeps the screen awake for as long as it is mounted. */
export function KeepAwake() {
  useKeepAwake();
  return null;
}
