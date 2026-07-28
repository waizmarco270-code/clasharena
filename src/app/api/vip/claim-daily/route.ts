import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId || !adminDb) {
      return NextResponse.json({ error: "Invalid request or db uninitialized" }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);

    const result = await adminDb.runTransaction(async (transaction: any) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new Error("User not found");
      }

      const userData = userSnap.data();
      if (!userData.isVip) {
        throw new Error("User does not have an active VIP Pass");
      }

      const now = new Date();
      const lastClaim = userData.lastDailyClaim ? userData.lastDailyClaim.toDate() : null;

      if (lastClaim) {
        const timeDiff = now.getTime() - lastClaim.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        if (hoursDiff < 24) {
          throw new Error("Daily reward already claimed. Please wait 24 hours from your last claim.");
        }
      }

      // Valid claim
      transaction.update(userRef, {
        balance: FieldValue.increment(10),
        totalCoinsEarned: FieldValue.increment(10),
        lastDailyClaim: FieldValue.serverTimestamp()
      });

      return { success: true, coinsAwarded: 10 };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
