import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tournamentId, claim } = await request.json();

    if (!tournamentId || !claim) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const tournamentRef = adminDb.collection('tournaments').doc(tournamentId);

    const settlementResult = await adminDb.runTransaction(async (transaction) => {
      const tournamentSnap = await transaction.get(tournamentRef);
      if (!tournamentSnap.exists) throw new Error('Challenge not found');
      
      const tournament = tournamentSnap.data()!;
      
      if (tournament.status !== 'active') {
        throw new Error(`Cannot submit claim. Challenge is ${tournament.status}.`);
      }
      
      const isCreator = tournament.creatorId === userId;
      const isAcceptor = tournament.acceptorId === userId;

      if (!isCreator && !isAcceptor) {
        throw new Error('You are not a participant in this battle.');
      }

      if (isCreator && tournament.creatorClaim) throw new Error('You already submitted your claim.');
      if (isAcceptor && tournament.acceptorClaim) throw new Error('You already submitted your claim.');

      const updateData: any = {};
      if (isCreator) updateData.creatorClaim = claim;
      if (isAcceptor) updateData.acceptorClaim = claim;

      // Check if this submission completes the battle
      const crClaim = isCreator ? claim : tournament.creatorClaim;
      const acClaim = isAcceptor ? claim : tournament.acceptorClaim;

      let battleStatus = 'active';

      if (crClaim && acClaim) {
        // Both have claimed
        const settingsSnap = await transaction.get(adminDb.collection('app-settings').doc('vs-arena'));
        const settings = settingsSnap.exists ? settingsSnap.data() : { settlementMode: 'auto' };

        if (crClaim === 'win' && acClaim === 'loss') {
          // Creator Won
          battleStatus = 'pending_settlement';
          updateData.status = 'pending_settlement';
          updateData.winnerId = tournament.creatorId;
        } else if (crClaim === 'loss' && acClaim === 'win') {
          // Acceptor Won
          battleStatus = 'pending_settlement';
          updateData.status = 'pending_settlement';
          updateData.winnerId = tournament.acceptorId;
        } else {
          // Dispute (Both Won, Both Lost, or Draw)
          battleStatus = 'disputed';
          updateData.status = 'disputed';
        }
      }

      transaction.update(tournamentRef, updateData);
      
      return battleStatus;
    });

    return NextResponse.json({ success: true, status: settlementResult });
  } catch (error: any) {
    console.error("VS Settle API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
