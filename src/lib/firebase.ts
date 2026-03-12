import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDpTn6eKrNdbvkhSIXK248VzEfcdvx-utk',
  authDomain: 'libertypocker-43a10.firebaseapp.com',
  projectId: 'libertypocker-43a10',
  storageBucket: 'libertypocker-43a10.firebasestorage.app',
  messagingSenderId: '1036522410658',
  appId: '1:1036522410658:web:f98b0ae4bd0288a49d3dfb',
  measurementId: 'G-R51SRKQHKE',
};

export const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const auth = getAuth(app);
export const db = getFirestore(app);
