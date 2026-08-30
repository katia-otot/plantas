"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  getRedirectResult,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import { getFirebaseWebConfig } from "@/lib/firebase-client-config";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  if (app) {
    return app;
  }
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  app = initializeApp(getFirebaseWebConfig());
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) {
    return auth;
  }
  auth = getAuth(getFirebaseApp());
  return auth;
}

export function createGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

/** True when Firebase Auth may run on this origin (not a raw IP). */
export function canUseInAppFirebaseAuth(hostname = window.location.hostname) {
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return true;
  }
  // Firebase authorized domains cannot be raw IPv4/IPv6.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) {
    return false;
  }
  return true;
}

export async function signInWithGooglePopup(): Promise<UserCredential> {
  return signInWithPopup(getFirebaseAuth(), createGoogleProvider());
}

export async function consumeGoogleRedirectResult() {
  return getRedirectResult(getFirebaseAuth());
}

export async function getIdTokenFromCredential(credential: UserCredential) {
  return credential.user.getIdToken();
}
