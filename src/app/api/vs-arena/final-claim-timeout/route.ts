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

    const result = await adminDb.runTransaction(async (transaction) => {
      const challengeSnap = await transaction.get(challengeRef);
      if (!challengeSnap.exists) throw new Error('Challenge not found');
      
      const challenge = challengeSnap.data()!;
      
      if (challenge.status !== 'pending_settlement') {
        throw new Error(`Cannot claim timeout. Challenge is ${challenge.status}.`);
      }

      const amICreator = challenge.creatorId === userId;
      const amIAcceptor = challenge.acceptorId === userId;

      if (!amICreator && !amIAcceptor) {
        throw new Error('You are not a participant in this battle.');
      }

      const myClaim = amICreator ? challenge.creatorClaim : challenge.acceptorClaim;
      const oppClaim = amICreator ? challenge.acceptorClaim : challenge.creatorClaim;

      if (!myClaim) throw new Error('You have not made a claim yet.');
      if (oppClaim) throw new Error('Opponent has already made a claim.');

      if (!challenge.pendingSettlementSince) {
        throw new Error('Missing pending settlement timestamp.');
      }

      const pendingTime = new Date(challenge.pendingSettlementSince).getTime();
      const claimTime = pendingTime + 12 * 60 * 60 * 1000; // 12 hours

      if (Date.now() < claimTime) {
        throw new Error('You must wait 12 hours before claiming a final timeout win.');
      }

      // Settled by timeout. Winner gets everything.
      const winnerId = userId;
      const loserId = amICreator ? challenge.acceptorId : challenge.creatorId;

      const totalPool = challenge.pool;
      
      const winnerPrize = totalPool; // 100% payout

      const winnerRef = adminDb.collection('users').doc(winnerId);
      
      transaction.update(winnerRef, {
        vCashBalance: FieldValue.increment(winnerPrize),
        totalWinnings: FieldValue.increment(winnerPrize),
        'stats.wins': FieldValue.increment(1)
      });
      
      const loserRef = adminDb.collection('users').doc(loserId);
      transaction.update(loserRef, {
         'stats.losses': FieldValue.increment(1)
      });

      const updates: any = {
         status: 'completed',
         winnerId,
         loserId,
         prizeAwarded: winnerPrize,
         settledAt: new Date().toISOString(),
         settledBy: 'timeout_system'
      };

      transaction.update(challengeRef, updates);
      return updates;
    });

    return NextResponse.json({ success: true, newStatus: result });
  } catch (error: any) {
    console.error("VS Final Claim Timeout API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
