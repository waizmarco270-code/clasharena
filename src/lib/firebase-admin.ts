import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

const privateKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;
const projectId = process.env.FIREBASE_SERVICE_ACCOUNT_PROJECT_ID;
const clientEmail = process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL;

const formattedKey = privateKey 
  ? privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n') 
  : undefined;

let app;

if (getApps().length > 0) {
  app = getApp();
} else if (projectId && clientEmail && formattedKey) {
  try {
    app = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });
  } catch (error: any) {
    console.error("Firebase admin init error:", error);
    try { require('fs').appendFileSync('error.log', new Date().toISOString() + '\\nINIT ERROR:\\n' + (error.stack || error.message || error) + '\\n\\n'); } catch (e) {}
  }
} else {
  console.warn("FIREBASE ADMIN WARNING: Missing environment variables! projectId:", !!projectId, "clientEmail:", !!clientEmail, "formattedKey:", !!formattedKey);
  try { require('fs').appendFileSync('error.log', new Date().toISOString() + '\\nMISSING ENV VARS:\\nprojectId: ' + !!projectId + '\\nclientEmail: ' + !!clientEmail + '\\nformattedKey: ' + !!formattedKey + '\\n\\n'); } catch (e) {}
}

export const adminMessaging = app ? getMessaging(app) : null as any;
export const adminDb = app ? getFirestore(app) : null as any;
