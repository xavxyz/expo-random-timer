// Synthesises the soft bell into assets/bell.wav: a few sine partials, each
// with its own exponential decay, and a short fade-in so the strike doesn't
// click. Replace the .wav with any recording to change the bell.
// Run: node scripts/synthesize-bell.mjs
import { writeFileSync } from 'node:fs';

const SAMPLE_RATE = 44100;
const DURATION_S = 1.2;
const FUNDAMENTAL_HZ = 1175; // D6: high enough to cut through a room
const PEAK = 0.7;
const ATTACK_S = 0.002; // near-instant strike

// [frequency ratio, amplitude, decay time constant in seconds]
const PARTIALS = [
  [1, 1, 0.35],
  [2.01, 0.55, 0.22],
  [2.76, 0.4, 0.16],
  [4.07, 0.25, 0.1],
  [5.4, 0.15, 0.06],
];

const n = Math.floor(SAMPLE_RATE * DURATION_S);
const samples = new Float64Array(n);
for (let i = 0; i < n; i++) {
  const t = i / SAMPLE_RATE;
  const attack = Math.min(1, t / ATTACK_S);
  // taper the last 50 ms to exact silence
  const tail = Math.min(1, (DURATION_S - t) / 0.05);
  let v = 0;
  for (const [ratio, amp, tau] of PARTIALS) {
    v += amp * Math.exp(-t / tau) * Math.sin(2 * Math.PI * FUNDAMENTAL_HZ * ratio * t);
  }
  samples[i] = v * attack * tail;
}

const max = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const pcm = Buffer.alloc(n * 2);
for (let i = 0; i < n; i++) {
  pcm.writeInt16LE(Math.round((samples[i] / max) * PEAK * 32767), i * 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // fmt chunk size
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // mono
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
header.writeUInt16LE(2, 32); // block align
header.writeUInt16LE(16, 34); // bits per sample
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

const out = new URL('../assets/bell.wav', import.meta.url);
writeFileSync(out, Buffer.concat([header, pcm]));
console.log(`wrote ${out.pathname}`);
