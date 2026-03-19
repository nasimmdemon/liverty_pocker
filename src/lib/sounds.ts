/**
 * Game sound effects using Web Audio API (no external files needed).
 * Fold: short low thud. Win: short rising fanfare.
 */

let audioContext: AudioContext | null = null;
let globalMuted = false;

export function setGlobalMuted(muted: boolean): void {
  globalMuted = muted;
}

export function isGlobalMuted(): boolean {
  return globalMuted;
}

function getAudioContext(): AudioContext | null {
  if (audioContext && audioContext.state !== 'closed') return audioContext;
  if (audioContext?.state === 'closed') audioContext = null;
  try {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return audioContext;
  } catch {
    return null;
  }
}

/** Call on first user interaction to unlock audio (browsers block until then) */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {}).catch(() => {});
  }
}

function playToneInternal(ctx: AudioContext, freq: number, durationMs: number, volume: number, type: OscillatorType): void {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (_) {}
}

function playTone(freq: number, durationMs: number, volume = 0.3, type: OscillatorType = 'sine'): void {
  if (globalMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => playToneInternal(ctx, freq, durationMs, volume, type)).catch(() => {});
    return;
  }
  playToneInternal(ctx, freq, durationMs, volume, type);
}

/** Card fold / discard sound — short low thud */
export function playFoldSound(): void {
  playTone(120, 100, 0.45, 'sine');
}

/** Card flip / reveal sound — short crisp tone (table/community cards only) */
export function playCardRevealSound(): void {
  playTone(440, 80, 0.4, 'sine');
}

/** Your turn to act — gentle attention chime */
export function playYourTurnSound(): void {
  playTone(523.25, 120, 0.4, 'sine');
  setTimeout(() => playTone(659.25, 100, 0.35, 'sine'), 90);
}

/** Check action — soft tap */
export function playCheckSound(): void {
  playTone(220, 60, 0.35, 'sine');
}

/** Win / jackpot sound — short rising fanfare */
export function playWinSound(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 180, 0.4, 'sine'), i * 90);
  });
}

/** Stopwatch tick — plays in last 10 seconds of turn timer */
export function playTickSound(): void {
  playTone(880, 40, 0.15, 'sine');
}
