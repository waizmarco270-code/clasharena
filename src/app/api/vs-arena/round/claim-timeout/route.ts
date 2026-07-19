import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { challengeId, roundId } = await request.json();
    if (!challengeId || !roundId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const challengeRef = adminDb.collection('vs-challenges').doc(challengeId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const challengeSnap = await transaction.get(challengeRef);
      if (!challengeSnap.exists) throw new Error('Challenge not found');
      
      const challenge = challengeSnap.data()!;
      
      if (challenge.status !== 'active') {
        throw new Error(`Cannot claim timeout. Challenge is ${challenge.status}.`);
      }

      const amICreator = challenge.creatorId === userId;
      const amIAcceptor = challenge.acceptorId === userId;

      if (!amICreator && !amIAcceptor) {
        throw new Error('You are not a participant in this battle.');
      }

      const rounds = challenge.rounds || {};
      const currentRound = rounds[roundId];

      if (!currentRound) throw new Error('Round data missing.');
      if (currentRound.winnerId) throw new Error('Round is already settled.');

      const mySub = amICreator ? currentRound.creatorSubmission : currentRound.acceptorSubmission;
      const oppSub = amICreator ? currentRound.acceptorSubmission : currentRound.creatorSubmission;

      if (!mySub) throw new Error('You have not submitted your round yet.');
      if (oppSub) throw new Error('Opponent has already submitted their round.');

      const submittedTime = new Date(mySub.submittedAt).getTime();
      const claimTime = submittedTime + 3 * 60 * 60 * 1000;

      if (Date.now() < claimTime) {
        throw new Error('You must wait 3 hours before claiming an auto-win.');
      }

      // Claim the round
      currentRound.winnerId = userId;
      
      // Update scores
      const scores = challenge.scores || { creator: 0, acceptor: 0 };
      if (amICreator) scores.creator += 1;
      else scores.acceptor += 1;

      const updates: any = { rounds, scores };

      // Check if this concludes the entire match
      if (scores.creator >= 2 || scores.acceptor >= 2 || (rounds['1']?.winnerId && rounds['2']?.winnerId && rounds['3']?.winnerId)) {
         updates.status = 'pending_settlement';
         updates.pendingSettlementSince = new Date().toISOString();
      }

      transaction.update(challengeRef, updates);
      return updates.status;
    });

    return NextResponse.json({ success: true, newStatus: result });
  } catch (error: any) {
    console.error("VS Claim Auto-Win API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
