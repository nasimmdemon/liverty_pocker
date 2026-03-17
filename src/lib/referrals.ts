import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const REFERRAL_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredId: string;
  referredName: string;
  referredPhotoURL: string | null;
  status: 'invited' | 'joined' | 'played';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReferralStats {
  invited: number;
  joined: number;
  played: number;
}

/** Generate a unique referral code (6 chars, no ambiguous chars) */
export function generateReferralCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += REFERRAL_CODE_CHARS[Math.floor(Math.random() * REFERRAL_CODE_CHARS.length)];
  }
  return code;
}

/** Get or create referral code for a user. Stored in users/{uid} */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  const data = snap.data();
  if (data?.referralCode) return data.referralCode as string;

  // Generate unique code (retry if collision)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    const existing = await getDocs(query(collection(db, 'users'), where('referralCode', '==', code)));
    if (existing.empty) {
      await setDoc(userRef, { referralCode: code }, { merge: true });
      return code;
    }
  }
  // Fallback: use first 6 chars of uid (base36)
  const fallback = userId.replace(/-/g, '').slice(0, 6).toUpperCase() || 'REF' + Date.now().toString(36).slice(-3);
  await setDoc(userRef, { referralCode: fallback }, { merge: true });
  return fallback;
}

/** Resolve referral code to referrer userId */
export async function resolveReferralCode(code: string): Promise<string | null> {
  const q = query(collection(db, 'users'), where('referralCode', '==', code.toUpperCase()));
  const snap = await getDocs(q);
  const doc = snap.docs[0];
  return doc?.id ?? null;
}

/** Create referral record when a new user signs up via referral link */
export async function createReferralRecord(
  referrerId: string,
  referredId: string,
  referredName: string,
  referredPhotoURL: string | null
): Promise<void> {
  const ref = doc(collection(db, 'referrals'));
  await setDoc(ref, {
    referrerId,
    referredId,
    referredName,
    referredPhotoURL,
    status: 'joined',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Get referral stats for a user (invited, joined, played counts) */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const q = query(collection(db, 'referrals'), where('referrerId', '==', userId));
  const snap = await getDocs(q);
  const stats: ReferralStats = { invited: 0, joined: 0, played: 0 };
  snap.docs.forEach((d) => {
    const s = (d.data().status as string) || 'joined';
    if (s === 'invited') stats.invited++;
    else if (s === 'joined') stats.joined++;
    else stats.played++;
  });
  return stats;
}

/** Subscribe to referral stats in real time */
export function subscribeReferralStats(userId: string, callback: (stats: ReferralStats) => void): () => void {
  const q = query(collection(db, 'referrals'), where('referrerId', '==', userId));
  return onSnapshot(q, (snap) => {
    const stats: ReferralStats = { invited: 0, joined: 0, played: 0 };
    snap.docs.forEach((d) => {
      const s = (d.data().status as string) || 'joined';
      if (s === 'invited') stats.invited++;
      else if (s === 'joined') stats.joined++;
      else stats.played++;
    });
    callback(stats);
  });
}

/** Get list of referred users (for avatars display) */
export async function getReferredUsers(userId: string): Promise<ReferralRecord[]> {
  const q = query(collection(db, 'referrals'), where('referrerId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReferralRecord));
}
