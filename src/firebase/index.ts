'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { firebaseConfig } from './config';

/**
 * Initializes Firebase with specific settings for Cloud Workstations.
 * We use experimentalForceLongPolling to prevent "Failed to fetch" errors
 * caused by proxy/WebSocket limitations in this environment.
 */
export function initializeFirebase() {
  if (getApps().length > 0) {
    const app = getApp();
    return {
      firebaseApp: app,
      firestore: getFirestore(app),
      auth: getAuth(app),
    };
  }

  const firebaseApp = initializeApp(firebaseConfig);
  
  // Use Long Polling to ensure stable connectivity in cloud IDE environments
  const firestore = initializeFirestore(firebaseApp, {
    experimentalForceLongPolling: true,
  });
  
  const auth = getAuth(firebaseApp);

  return { firebaseApp, firestore, auth };
}

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export { errorEmitter } from './error-emitter';
export { FirestorePermissionError } from './errors';
