/**
 * Firestore-backed knobs for the monitor dashboard (bot fallback, etc.).
 * Doc: monitor_settings/controls
 */
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const MONITOR_CONTROLS_REF = doc(db, 'monitor_settings', 'controls');

export function subscribeBotFallbackDisabledPools(
  onUpdate: (disabledPoolIds: Set<string>) => void
): () => void {
  return onSnapshot(
    MONITOR_CONTROLS_REF,
    (snap) => {
      const raw = snap.data()?.botFallbackDisabledPoolIds;
      const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
      onUpdate(new Set(ids));
    },
    () => onUpdate(new Set())
  );
}

export async function fetchBotFallbackDisabledPools(): Promise<Set<string>> {
  const snap = await getDoc(MONITOR_CONTROLS_REF);
  const raw = snap.data()?.botFallbackDisabledPoolIds;
  const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [];
  return new Set(ids);
}

export async function saveBotFallbackDisabledPools(poolIds: string[]): Promise<void> {
  await setDoc(
    MONITOR_CONTROLS_REF,
    { botFallbackDisabledPoolIds: poolIds, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
