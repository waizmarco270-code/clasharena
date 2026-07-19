import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('vCashBalance', '>', 0).get();
    
    const batch = adminDb.batch();
    let count = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.unplayedBalance === undefined) {
        batch.update(doc.ref, { unplayedBalance: data.vCashBalance });
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
    }
    
    return NextResponse.json({ success: true, count, msg: `Migrated ${count} users` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
