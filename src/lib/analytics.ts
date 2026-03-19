import { collection, doc, setDoc, getDoc, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ANALYTICS_COLLECTION = 'analytics_visits';
const SESSION_KEY = 'liberty_analytics_session';

export interface AnalyticsVisit {
  id?: string;
  sessionId: string;
  firstSeen: number;
  lastSeen: number;
  userId?: string;
  userEmail?: string;
  userName?: string;
  played: boolean;
  device: string;
  platform: string;
  screenWidth: number;
  screenHeight: number;
  language: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  referrer?: string;
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = `s_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function getDeviceInfo(): { device: string; platform: string } {
  if (typeof navigator === 'undefined') return { device: 'unknown', platform: 'unknown' };
  const ua = navigator.userAgent;
  let device = 'desktop';
  if (/iPhone|iPad|iPod|Android/i.test(ua)) device = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) device = 'tablet';
  let platform = 'unknown';
  if (/iPhone|iPad|iPod/.test(ua)) platform = 'iOS';
  else if (/Android/i.test(ua)) platform = 'Android';
  else if (/Mac/i.test(ua)) platform = 'macOS';
  else if (/Win/i.test(ua)) platform = 'Windows';
  else if (/Linux/i.test(ua)) platform = 'Linux';
  return { device, platform };
}

async function fetchLocation(): Promise<{ country?: string; region?: string; city?: string; isp?: string }> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return {
      country: data.country_name,
      region: data.region,
      city: data.city,
      isp: data.org,
    };
  } catch {
    return {};
  }
}

export async function trackVisit(userId?: string, userEmail?: string, userName?: string): Promise<void> {
  try {
    const sessionId = getOrCreateSessionId();
    const { device, platform } = getDeviceInfo();
    const location = await fetchLocation();
    const docId = sessionId;
    const docRef = doc(db, ANALYTICS_COLLECTION, docId);
    const existingSnap = await getDoc(docRef);
    const existing = existingSnap.data();
    const now = Date.now();
    const isNew = !existingSnap.exists();
    await setDoc(docRef, {
      sessionId,
      firstSeen: isNew ? now : (existing?.firstSeen ?? now),
      lastSeen: now,
      userId: userId ?? null,
      userEmail: userEmail ?? null,
      userName: userName ?? null,
      played: isNew ? false : (existing?.played ?? false),
      device,
      platform,
      screenWidth: typeof window !== 'undefined' ? window.screen.width : 0,
      screenHeight: typeof window !== 'undefined' ? window.screen.height : 0,
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      ...location,
      referrer: typeof document !== 'undefined' ? (document.referrer || null) : null,
    }, { merge: true });
  } catch (e) {
    console.warn('[Analytics] trackVisit failed:', e);
  }
}

export async function trackPlayed(): Promise<void> {
  try {
    const sessionId = getOrCreateSessionId();
    const docRef = doc(db, ANALYTICS_COLLECTION, sessionId);
    const existingSnap = await getDoc(docRef);
    const data = existingSnap.data();
    await setDoc(docRef, {
      sessionId,
      firstSeen: data?.firstSeen ?? Date.now(),
      lastSeen: Date.now(),
      userId: data?.userId ?? null,
      userEmail: data?.userEmail ?? null,
      userName: data?.userName ?? null,
      played: true,
      device: data?.device ?? 'unknown',
      platform: data?.platform ?? 'unknown',
      screenWidth: data?.screenWidth ?? 0,
      screenHeight: data?.screenHeight ?? 0,
      language: data?.language ?? '',
      country: data?.country ?? null,
      region: data?.region ?? null,
      city: data?.city ?? null,
      isp: data?.isp ?? null,
      referrer: data?.referrer ?? null,
    }, { merge: true });
  } catch (e) {
    console.warn('[Analytics] trackPlayed failed:', e);
  }
}

export async function getAnalyticsVisits(days: 7 | 14 | 30 = 30): Promise<AnalyticsVisit[]> {
  const now = Date.now();
  const startMs = now - days * 24 * 60 * 60 * 1000;
  const q = query(
    collection(db, ANALYTICS_COLLECTION),
    where('lastSeen', '>=', startMs),
    orderBy('lastSeen', 'desc'),
    limit(500)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, lastSeen: data.lastSeen?.toMillis?.() ?? data.lastSeen, firstSeen: data.firstSeen?.toMillis?.() ?? data.firstSeen } as AnalyticsVisit;
  });
}
