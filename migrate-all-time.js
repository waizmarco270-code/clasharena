const admin = require('firebase-admin');

// Load environment variables for local testing (optional, since we will use the default credentials or key)
require('dotenv').config({ path: '.env.local' });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function migrate() {
  console.log("Starting migration...");
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  let count = 0;

  const batch = db.batch();

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.totalCoinsEarned === undefined) {
      batch.update(doc.ref, {
        totalCoinsEarned: data.balance || 0
      });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully migrated ${count} users.`);
  } else {
    console.log("No users needed migration.");
  }
}

migrate().then(() => process.exit(0)).catch(console.error);
