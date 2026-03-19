/**
 * Lightweight haptic feedback using the Vibration API.
 * Falls back silently on unsupported devices.
 */

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/** Light tap — button presses, selections */
export function hapticLight() {
  vibrate(10);
}

/** Medium tap — confirmations, toggles */
export function hapticMedium() {
  vibrate(20);
}

/** Heavy tap — important actions (join table, fold, raise) */
export function hapticHeavy() {
  vibrate(35);
}

/** Success pattern — win animations */
export function hapticSuccess() {
  vibrate([15, 50, 15]);
}

/** Error/warning pattern */
export function hapticError() {
  vibrate([30, 30, 30]);
}
