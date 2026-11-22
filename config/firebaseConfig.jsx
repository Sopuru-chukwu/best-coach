import { Platform } from 'react-native';
import { initializeApp, getApps, getApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyAuEBv_j8bdlf8DvkVUbg_szlbIeuOE0h0',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'best-coach-704b6.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'best-coach-704b6',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'best-coach-704b6.firebasestorage.app',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '654121861076',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:654121861076:web:d27c84bbed462fb3a52041',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-BMV5227VC3',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function initAuth() {
  if (Platform.OS === 'web') {
    return FirebaseAuth.getAuth(app);
  }

  try {
    const getPersistence = FirebaseAuth['getReactNativePersistence'];
    if (typeof getPersistence === 'function') {
      return FirebaseAuth.initializeAuth(app, {
        persistence: getPersistence(ReactNativeAsyncStorage),
      });
    }
    return FirebaseAuth.getAuth(app);
  } catch {
    // Fallback when auth is already initialized (e.g., Fast Refresh)
    return FirebaseAuth.getAuth(app);
  }
}

export const auth = initAuth();
export const db = getFirestore(app);

// Only initialize Web Analytics in supported browser environments
if (Platform.OS === 'web') {
  import('firebase/analytics')
    .then(async ({ getAnalytics, isSupported }) => {
      if (await isSupported()) {
        getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics is optional; ignore if unavailable in this runtime
    });
}
