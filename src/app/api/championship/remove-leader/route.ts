import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { championshipId, userId, teamId } = await req.json();

    if (!championshipId || !userId || !teamId) {
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
      if (!regDoc.exists) throw new Error('Registration not found');

      const tData = tDoc.data()!;
      const userData = userDoc.data()!;
      const cost = tData.leaderPassCost || 0;

      // Update Tournament Slot
      if (teamId === 'teamA') {
        transaction.update(tRef, { teamALeader: '' });
      } else if (teamId === 'teamB') {
        transaction.update(tRef, { teamBLeader: '' });
      } else {
        throw new Error('Invalid team ID');
      }

      // Process Refund
      transaction.update(userRef, { coins: userData.coins + cost });

      // Ban from buying pass again
      transaction.update(regRef, { boughtLeaderPass: false, bannedFromLeaderPass: true });

      // Create Wallet Log
      transaction.set(logRef, {
        userId,
        username: userData.username,
        amount: cost,
        method: 'REFUND',
        type: 'LEADER_PASS_REFUND',
        status: 'approved',
        createdAt: new Date().toISOString(),
        championshipId,
        description: `Refund for Leader Pass in ${tData.name}`
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing leader:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
