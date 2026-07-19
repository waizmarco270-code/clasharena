import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    if (!adminDb) {
      return NextResponse.json({ error: "Firebase DB uninitialized" }, { status: 500 });
    }

    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.get();
    
    let migratedCount = 0;
    const batch = adminDb.batch();
    
    // Firestore batches support up to 500 operations.
    // If you have more than 500 users, we'd need to chunk it. 
    // Assuming < 500 for this quick migration.
    let currentBatchSize = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.totalCoinsEarned === undefined) {
        batch.update(doc.ref, {
          totalCoinsEarned: data.balance || 0
        });
        migratedCount++;
        currentBatchSize++;
        
        if (currentBatchSize >= 490) {
           await batch.commit();
           currentBatchSize = 0;
        }
      }
    }

    if (currentBatchSize > 0) {
      await batch.commit();
    }

    return NextResponse.json({ success: true, migratedCount });
  } catch (err: any) {
    console.error("Migration error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
