'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let firestore: Firestore;
let auth: Auth;

/**
 * OPTIMIZATION: Removed experimentalForceLongPolling
 * 
 * That setting was a Cloud Workstations dev workaround. Production on Vercel
 * uses the default WebChannel transport which is significantly faster and
 * more efficient than long polling.
 */
export function initializeFirebase() {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    app = initializeApp(firebaseConfig);
  }

  // Ensure Firestore is only initialized once
  if (!firestore) {
    try {
      firestore = initializeFirestore(app, {
        localCache: persistentLocalCache()
      });
    } catch (e) {
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
export { GlobalDataProvider, useProfile, useBackgrounds, useMaintenance, useAnnouncements, useReleases, useAdminStatus } from './global-data-provider';
