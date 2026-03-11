/**
 * Game sound effects using Web Audio API (no external files needed).
 * Fold: short low thud. Win: short rising fanfare.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext;
  try {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return audioContext;
  } catch {
    return null;
  }
}

function playTone(freq: number, durationMs: number, volume = 0.3, type: OscillatorType = 'sine'): void {
  const ctx = getAudioContext();
  if (!ctx) return;
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

/** Card fold / discard sound — short low thud */
export function playFoldSound(): void {
  playTone(120, 80, 0.25, 'sine');
}

/** Card flip / reveal sound — short crisp tone */
export function playCardRevealSound(): void {
  playTone(440, 60, 0.18, 'sine');
}

/** Win / jackpot sound — short rising fanfare */
export function playWinSound(): void {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 150, 0.22, 'sine'), i * 90);
  });
}
