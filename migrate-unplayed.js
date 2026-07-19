const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccountKeyPath = './firebase-service-account.json';

if (fs.existsSync(serviceAccountKeyPath)) {
    const serviceAccount = require(serviceAccountKeyPath);
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
} else {
    // try default app
    if (!admin.apps.length) {
        admin.initializeApp();
    }
}

const db = admin.firestore();

async function migrate() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('vCashBalance', '>', 0).get();
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.unplayedBalance === undefined) {
      batch.update(doc.ref, { unplayedBalance: data.vCashBalance });
      count++;
      console.log('Migrating user:', doc.id);
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Migrated ${count} users to new Unplayed Balance system.`);
  } else {
    console.log('No users needed migration.');
  }
}

migrate().then(() => process.exit(0)).catch(console.error);
