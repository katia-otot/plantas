/**
 * Public Firebase web config (same project as FCM / notify-web).
 * Safe to expose in the browser. Override with NEXT_PUBLIC_FIREBASE_* env vars.
 */
export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const DEFAULT_CONFIG: FirebaseWebConfig = {
  apiKey: "AIzaSyDqz5BdXkUNfWoCTCUm2RnsWAmg-HfL44I",
  authDomain: "plantas-patio.firebaseapp.com",
  projectId: "plantas-patio",
  storageBucket: "plantas-patio.firebasestorage.app",
  messagingSenderId: "532848276167",
  appId: "1:532848276167:web:eff8aa880c6354e84c44e2",
};

export function getFirebaseWebConfig(): FirebaseWebConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || DEFAULT_CONFIG.apiKey,
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ||
      DEFAULT_CONFIG.authDomain,
    projectId:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
      DEFAULT_CONFIG.projectId,
    storageBucket:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
      DEFAULT_CONFIG.storageBucket,
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() ||
      DEFAULT_CONFIG.messagingSenderId,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim() || DEFAULT_CONFIG.appId,
  };
}

/** Hosted Google sign-in page (authorized domain). Needed when the app runs on a raw IP. */
export function getFirebaseAuthBridgeUrl(): string {
  return (
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_BRIDGE_URL?.trim() ||
    "https://plantas-patio.web.app/auth-login.html"
  );
}