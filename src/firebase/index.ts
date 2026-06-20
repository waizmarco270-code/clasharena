'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore, FirestoreSettings } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

/**
 * Initializes Firebase with specific settings for Cloud Workstations.
 * We use experimentalForceLongPolling and useFetchStreams: false to prevent 
 * connection hangs in this environment.
 */
export function initializeFirebase() {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    app = initializeApp(firebaseConfig);
  }

  // Ensure Firestore is only initialized once with the correct settings
  if (!firestore) {
    const settings: FirestoreSettings = {
      experimentalForceLongPolling: true,
    };
    try {
      firestore = initializeFirestore(app, settings);
    } catch (e) {
      // If already initialized, get the existing instance
      firestore = getFirestore(app);
    }
  }

  if (!auth) {
    auth = getAuth(app);
  }

  return { firebaseApp: app, firestore, auth };
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export { errorEmitter } from './error-emitter';
export { FirestorePermissionError } from './errors';
