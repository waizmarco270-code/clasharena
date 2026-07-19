import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { challengeId } = await request.json();
    if (!challengeId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const challengeRef = adminDb.collection('vs-challenges').doc(challengeId);
    const userRef = adminDb.collection('users').doc(userId);

    await adminDb.runTransaction(async (transaction) => {
      const challengeSnap = await transaction.get(challengeRef);
      if (!challengeSnap.exists) throw new Error('Challenge not found');
      
      const challenge = challengeSnap.data()!;
      
      if (challenge.creatorId !== userId) {
        throw new Error('Only the creator can cancel this challenge.');
      }
      
      if (challenge.status !== 'open') {
        throw new Error(`Cannot cancel challenge because it is currently ${challenge.status}.`);
      }

      const createdAtStr = challenge.createdAt;
      const createdAt = new Date(createdAtStr).getTime();
      const cancelTime = createdAt + 12 * 60 * 60 * 1000;
      
      if (Date.now() < cancelTime) {
         throw new Error('You must wait 12 hours before cancelling.');
      }

      const refundAmount = challenge.wager;

      // Refund the user
      transaction.update(userRef, {
        vCashBalance: FieldValue.increment(refundAmount),
        unplayedBalance: FieldValue.increment(refundAmount)
      });
      
      // Delete the challenge to clear it from the lobby
      transaction.delete(challengeRef);
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("VS Cancel API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
