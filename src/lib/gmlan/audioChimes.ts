/**
 * GM Instrument Cluster & Radio Audio Chime Synthesizer
 * Uses Web Audio API to produce authentic GM chime frequencies (780 Hz & 880 Hz bells)
 * for 0x00F / 0x045 message triggers and DIC warning alerts.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playGmChime(
  tone: 'REMINDER' | 'WARNING' | 'CRITICAL' | 'KEY_IN_IGNITION' | 'SEATBELT' = 'REMINDER',
  volume: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
  repeatCount: number = 3
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const gainFactor = volume === 'LOW' ? 0.08 : volume === 'MEDIUM' ? 0.18 : 0.32;
  const now = ctx.currentTime;

  let baseFreq = 784; // G5 note characteristic of GM IPC chime
  let intervalSec = 0.35;

  if (tone === 'WARNING') {
    baseFreq = 830;
    intervalSec = 0.28;
  } else if (tone === 'CRITICAL') {
    baseFreq = 932;
    intervalSec = 0.22;
  } else if (tone === 'KEY_IN_IGNITION') {
    baseFreq = 740;
    intervalSec = 0.45;
  }

  for (let i = 0; i < repeatCount; i++) {
    const startTime = now + i * intervalSec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, startTime);

    // Warm second harmonic for acoustic chime bell resonance
    const oscHarmonic = ctx.createOscillator();
    const gainHarmonic = ctx.createGain();
    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(baseFreq * 2, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainFactor, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

    gainHarmonic.gain.setValueAtTime(0, startTime);
    gainHarmonic.gain.linearRampToValueAtTime(gainFactor * 0.25, startTime + 0.02);
    gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);

    osc.connect(gain);
    oscHarmonic.connect(gainHarmonic);
    gain.connect(ctx.destination);
    gainHarmonic.connect(ctx.destination);

    osc.start(startTime);
    oscHarmonic.start(startTime);
    osc.stop(startTime + 0.35);
    oscHarmonic.stop(startTime + 0.35);
  }
}
