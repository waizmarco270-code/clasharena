import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { challengeId, claim } = await request.json();

    if (!challengeId || !claim) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const challengeRef = adminDb.collection('vs-challenges').doc(challengeId);

    const settlementResult = await adminDb.runTransaction(async (transaction) => {
      const challengeSnap = await transaction.get(challengeRef);
      if (!challengeSnap.exists) throw new Error('Challenge not found');
      
      const challenge = challengeSnap.data()!;
      
      if (challenge.status !== 'active') {
        throw new Error(`Cannot submit claim. Challenge is ${challenge.status}.`);
      }
      
      const isCreator = challenge.creatorId === userId;
      const isAcceptor = challenge.acceptorId === userId;

      if (!isCreator && !isAcceptor) {
        throw new Error('You are not a participant in this battle.');
      }

      if (isCreator && challenge.creatorClaim) throw new Error('You already submitted your claim.');
      if (isAcceptor && challenge.acceptorClaim) throw new Error('You already submitted your claim.');

      const updateData: any = {};
      if (isCreator) updateData.creatorClaim = claim;
      if (isAcceptor) updateData.acceptorClaim = claim;

      // Check if this submission completes the battle
      const crClaim = isCreator ? claim : challenge.creatorClaim;
      const acClaim = isAcceptor ? claim : challenge.acceptorClaim;

      let battleStatus = 'active';

      if (crClaim && acClaim) {
        // Both have claimed
        const settingsSnap = await transaction.get(adminDb.collection('app-settings').doc('vs-arena'));
        const settings = settingsSnap.exists ? settingsSnap.data() : { settlementMode: 'auto' };

        if (crClaim === 'win' && acClaim === 'loss') {
          // Creator Won
          if (settings?.settlementMode === 'manual') {
             battleStatus = 'pending_settlement';
             updateData.status = 'pending_settlement';
             updateData.winnerId = challenge.creatorId;
          } else {
             battleStatus = 'completed';
             updateData.winnerId = challenge.creatorId;
             updateData.status = 'completed';
             updateData.completedAt = new Date().toISOString();
             
             const payout = challenge.pool;
             const winnerRef = adminDb.collection('users').doc(challenge.creatorId);
             transaction.update(winnerRef, { vCashBalance: FieldValue.increment(payout) });
          }
        } else if (crClaim === 'loss' && acClaim === 'win') {
          // Acceptor Won
          if (settings?.settlementMode === 'manual') {
             battleStatus = 'pending_settlement';
             updateData.status = 'pending_settlement';
             updateData.winnerId = challenge.acceptorId;
          } else {
             battleStatus = 'completed';
             updateData.winnerId = challenge.acceptorId;
             updateData.status = 'completed';
             updateData.completedAt = new Date().toISOString();
             
             const payout = challenge.pool;
             const winnerRef = adminDb.collection('users').doc(challenge.acceptorId);
             transaction.update(winnerRef, { vCashBalance: FieldValue.increment(payout) });
          }
        } else {
          // Dispute (Both Won, Both Lost, or Draw)
          battleStatus = 'disputed';
          updateData.status = 'disputed';
        }
      }

      transaction.update(challengeRef, updateData);
      
      return battleStatus;
    });

    return NextResponse.json({ success: true, status: settlementResult });
  } catch (error: any) {
    console.error("VS Settle API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
