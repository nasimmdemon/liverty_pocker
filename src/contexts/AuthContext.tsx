import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  botMatchesPlayed: number;
  createdAt: number;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  incrementBotMatches: () => Promise<void>;
  canInviteFriends: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BOT_MATCHES_REQUIRED = 3;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateProfile = useCallback(async (u: User): Promise<UserProfile> => {
    const ref = doc(db, 'users', u.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    const newProfile: UserProfile = {
      uid: u.uid,
      email: u.email ?? null,
      displayName: u.displayName ?? null,
      photoURL: u.photoURL ?? null,
      botMatchesPlayed: 0,
      createdAt: Date.now(),
    };
    await setDoc(ref, newProfile);
    return newProfile;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const p = await fetchOrCreateProfile(u);
          setProfile(p);
        } catch (e) {
          console.error('Failed to fetch profile:', e);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [fetchOrCreateProfile]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, displayName?: string) => {
    const { user: u } = await createUserWithEmailAndPassword(auth, email, password);
    const p = await fetchOrCreateProfile(u);
    if (displayName) {
      const ref = doc(db, 'users', u.uid);
      await setDoc(ref, { ...p, displayName }, { merge: true });
      setProfile({ ...p, displayName });
    } else {
      setProfile(p);
    }
  }, [fetchOrCreateProfile]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    const { user: u } = await signInWithPopup(auth, provider);
    const p = await fetchOrCreateProfile(u);
    setProfile(p);
  }, [fetchOrCreateProfile]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  }, []);

  const incrementBotMatches = useCallback(async () => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid);
    const newCount = (profile?.botMatchesPlayed ?? 0) + 1;
    await setDoc(ref, { ...profile, botMatchesPlayed: newCount, uid: user.uid }, { merge: true });
    setProfile((prev) => (prev ? { ...prev, botMatchesPlayed: newCount } : null));
  }, [user, profile]);

  const canInviteFriends = (profile?.botMatchesPlayed ?? 0) >= BOT_MATCHES_REQUIRED;

  const value: AuthContextValue = {
    user,
    profile,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    incrementBotMatches,
    canInviteFriends,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
