'use client';

/**
 * Firebase config — values from env vars (VITE_FIREBASE_* / NEXT_PUBLIC_*),
 * falling back to the built-in project config. Never hardcode new keys;
 * .env.example documents the variables.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyBaNjHmi-VlW8aFDDVN38OJkQCShYY2sFg',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'dominos-ftw.firebaseapp.com',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? 'https://dominos-ftw-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'dominos-ftw',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'dominos-ftw.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '476741872461',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:476741872461:web:3dc979b05a6175eadda504',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? 'G-1TBL91595F',
};

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);
}
