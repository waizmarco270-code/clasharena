import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { tournamentId } = body;

    if (!tournamentId) {
      return NextResponse.json({ error: 'Missing tournamentId' }, { status: 400 });
    }

    const tRef = adminDb.collection('tournaments').doc(tournamentId);
    const userRef = adminDb.collection('users').doc(userId);
    const registrationRef = tRef.collection('registrations').doc(userId);
    const historyRef = adminDb.collection('wallet-history').doc();

    const result = await adminDb.runTransaction(async (transaction) => {
      const [tSnap, userSnap, regSnap] = await transaction.getAll(tRef, userRef, registrationRef);

      if (!tSnap.exists) throw new Error('Tournament not found');
      if (!userSnap.exists) throw new Error('User profile not found');
      
      // Idempotency check: If already registered, safely return without deducting coins
      if (regSnap.exists) {
        return { success: true, message: 'Already registered' };
      }

      const t = tSnap.data()!;
      const profile = userSnap.data()!;

      // Concurrency-safe capacity and status checks
      if (t.status === 'completed' || t.status === 'closed') {
        throw new Error('Tournament is no longer open for registration');
      }
      
      if (t.currentPlayers >= t.maxPlayers) {
        throw new Error('Tournament is full');
      }
      
      if (t.townHall && t.townHall > 0 && profile.townHall !== t.townHall) {
        throw new Error(`Town Hall level mismatch. Requires TH ${t.townHall}`);
      }
      
      if (profile.balance < (t.entryFee || 0)) {
        throw new Error('Insufficient coins');
      }

      // We use Firestore serverTimestamp to guarantee consistency across devices
      const serverTime = FieldValue.serverTimestamp();

      // Atomic Writes
      if (t.entryFee > 0) {
        transaction.update(userRef, { balance: FieldValue.increment(-t.entryFee) });
        
        transaction.set(historyRef, {
          userId,
          amount: -t.entryFee,
          type: 'TOURNAMENT_ENTRY',
          description: `Entry fee for Arena: ${t.name}`,
          createdAt: serverTime
        });
      }

      transaction.update(tRef, { currentPlayers: FieldValue.increment(1) });
      
      transaction.set(registrationRef, {
        tournamentId,
        userId,
        username: profile.username || 'Warrior',
        tag: profile.tag || '',
        assignedClan: '',
        joinCode: '',
        registeredAt: serverTime
      });

      return { success: true, message: 'Successfully registered' };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Registration Transaction Error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
