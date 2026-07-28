import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tournamentId, roundId, stars, percent, timeSeconds, proofUrl } = await request.json();

    if (!tournamentId || !roundId || stars === undefined || percent === undefined || timeSeconds === undefined || !proofUrl) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const tournamentRef = adminDb.collection('tournaments').doc(tournamentId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const tournamentSnap = await transaction.get(tournamentRef);
      if (!tournamentSnap.exists) throw new Error('Challenge not found');
      
      const tournament = tournamentSnap.data()!;
      
      if (tournament.status !== 'active') {
        throw new Error(`Cannot submit result. Challenge is ${tournament.status}.`);
      }
      
      const isCreator = tournament.creatorId === userId;
      const isAcceptor = tournament.acceptorId === userId;

      if (!isCreator && !isAcceptor) {
        throw new Error('You are not a participant in this battle.');
      }

      // Initialize rounds and scores if not present
      const rounds = tournament.rounds || {};
      const scores = tournament.scores || { creator: 0, acceptor: 0 };
      
      if (!rounds[roundId]) {
         rounds[roundId] = {};
      }

      const currentRound = rounds[roundId];

      if (isCreator && currentRound.creatorSubmission) throw new Error('You already submitted your result for this round.');
      if (isAcceptor && currentRound.acceptorSubmission) throw new Error('You already submitted your result for this round.');

      const submission = {
        stars: Number(stars),
        percent: Number(percent),
        timeSeconds: Number(timeSeconds),
        proofUrl,
        submittedAt: new Date().toISOString()
      };

      if (isCreator) currentRound.creatorSubmission = submission;
      if (isAcceptor) currentRound.acceptorSubmission = submission;

      // Check if this submission completes the round
      if (currentRound.creatorSubmission && currentRound.acceptorSubmission) {
         const cr = currentRound.creatorSubmission;
         const ac = currentRound.acceptorSubmission;

         // Determine Round Winner
         let roundWinner: 'creator' | 'acceptor' | 'draw' = 'draw';

         if (cr.stars > ac.stars) {
            roundWinner = 'creator';
         } else if (ac.stars > cr.stars) {
            roundWinner = 'acceptor';
         } else {
            // Stars are equal, check percentage
            if (cr.percent > ac.percent) {
               roundWinner = 'creator';
            } else if (ac.percent > cr.percent) {
               roundWinner = 'acceptor';
            } else {
               // Percent equal, check time (LOWER IS BETTER)
               if (cr.timeSeconds < ac.timeSeconds) {
                  roundWinner = 'creator';
               } else if (ac.timeSeconds < cr.timeSeconds) {
                  roundWinner = 'acceptor';
               } else {
                  // Absolute Tie!
                  roundWinner = 'draw';
               }
            }
         }

         currentRound.winnerId = roundWinner === 'draw' ? 'draw' : (roundWinner === 'creator' ? tournament.creatorId : tournament.acceptorId);
         
         if (roundWinner === 'creator') scores.creator += 1;
         if (roundWinner === 'acceptor') scores.acceptor += 1;
      }

      const updateData: any = {
         rounds,
         scores
      };

      transaction.update(tournamentRef, updateData);
      return tournament.status;
    });

    return NextResponse.json({ success: true, status: result });
  } catch (error: any) {
    console.error("VS Round API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
