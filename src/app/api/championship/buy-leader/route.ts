import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { championshipId, userId } = await req.json();

    if (!championshipId || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const tRef = adminDb.collection('tournaments').doc(championshipId);
    const userRef = adminDb.collection('users').doc(userId);
    const regRef = adminDb.collection('tournaments').doc(championshipId).collection('registrations').doc(userId);
    const logRef = adminDb.collection('recharge-requests').doc(); // Create new log doc

    await adminDb.runTransaction(async (transaction) => {
      const tDoc = await transaction.get(tRef);
      const userDoc = await transaction.get(userRef);
      const regDoc = await transaction.get(regRef);

      if (!tDoc.exists) throw new Error('Tournament not found');
      if (!userDoc.exists) throw new Error('User not found');
      if (!regDoc.exists) throw new Error('You are not registered in this tournament');

      const tData = tDoc.data()!;
      const userData = userDoc.data()!;
      const regData = regDoc.data()!;

      if (tData.status !== 'leader_selection') {
        throw new Error('Leader selection is not active right now.');
      }

      if (regData.bannedFromLeaderPass) {
        throw new Error('You are blocked from buying the leader pass for this tournament.');
      }

      if (tData.teamALeader === userId || tData.teamBLeader === userId) {
        throw new Error('You are already a leader.');
      }

      const cost = tData.leaderPassCost || 0;
      if (cost <= 0) {
        throw new Error('Leader Pass is not enabled for this tournament.');
      }

      if (userData.coins < cost) {
        throw new Error(`Insufficient coins. You need ${cost} coins to buy the Leader Pass.`);
      }

      // Check for available slot
      let slotToFill = '';
      if (!tData.teamALeader) slotToFill = 'teamALeader';
      else if (!tData.teamBLeader) slotToFill = 'teamBLeader';
      else throw new Error('Both leader slots are already filled. Too late!');

      // Process Deduction
      transaction.update(userRef, { coins: userData.coins - cost });

      // Update Tournament Slot
      transaction.update(tRef, { [slotToFill]: userId });

      // Update Registration
      transaction.update(regRef, { boughtLeaderPass: true, leaderPassSlot: slotToFill });

      // Create Wallet Log
      transaction.set(logRef, {
        userId,
        username: userData.username,
        amount: -cost,
        method: 'DEDUCTION',
        type: 'TOURNAMENT_LEADER_PASS',
        status: 'approved',
        createdAt: new Date().toISOString(),
        championshipId,
        description: `Bought Leader Pass for ${tData.name}`
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error buying leader pass:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
