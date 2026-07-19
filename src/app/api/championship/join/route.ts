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
      const { championshipId, ticketType } = body;

    if (!championshipId) {
      return NextResponse.json({ error: 'Missing championshipId' }, { status: 400 });
    }

    const tRef = adminDb.collection('tournaments').doc(championshipId);
    const userRef = adminDb.collection('users').doc(userId);
    const registrationRef = tRef.collection('registrations').doc(userId);
    const historyRef = adminDb.collection('recharge-requests').doc();

    const result = await adminDb.runTransaction(async (transaction) => {
      const [tSnap, userSnap, regSnap] = await transaction.getAll(tRef, userRef, registrationRef);

      if (!tSnap.exists) throw new Error('Championship not found');
      if (!userSnap.exists) throw new Error('User profile not found');
      
      // Idempotency check
      if (regSnap.exists) {
        return { success: true, message: 'Already registered' };
      }

      const t = tSnap.data()!;
      const profile = userSnap.data()!;

      // Concurrency-safe status check
      if (t.status !== 'registration') {
        throw new Error('Registration is closed for this Championship');
      }
      
      const th = profile.townHall || 0;
      
      if (!t.thDistribution || t.thDistribution[th] === undefined) {
        throw new Error(`Town Hall ${th} is not allowed in this Championship.`);
      }
      
      const currentThCount = t.currentRegistered?.[th] || 0;
      if (currentThCount >= t.thDistribution[th]) {
        throw new Error(`The slots for Town Hall ${th} are completely full.`);
      }

      if (t.totalRegistered >= t.totalPlayers) {
        throw new Error('Championship is completely full.');
      }
      
      let usedTicket = false;
      const entryFee = t.entryFee || 0;

      if (ticketType && ticketType !== 'none') {
        const inventory = profile.inventory || {};
        const ticketCount = inventory[`${ticketType}Tickets`] || 0;
        
        if (ticketCount <= 0) {
          throw new Error(`You do not own any ${ticketType} tickets.`);
        }

        if (ticketType === 'bronze' && entryFee > 80) {
          throw new Error('Bronze tickets can only be used for tournaments up to 80 coins.');
        }
        if (ticketType === 'silver' && entryFee > 199) {
          throw new Error('Silver tickets can only be used for tournaments up to 199 coins.');
        }
        
        usedTicket = true;
      } else {
        if (profile.balance < entryFee) {
          throw new Error('Insufficient coins');
        }
      }

      const serverTime = FieldValue.serverTimestamp();

      // Atomic Writes
      if (usedTicket) {
        transaction.update(userRef, { [`inventory.${ticketType}Tickets`]: FieldValue.increment(-1) });
        
        transaction.set(historyRef, {
          userId,
          username: profile.username || 'Warrior',
          amount: 0,
          ticketUsed: ticketType,
          type: 'TICKET_ENTRY',
          description: `Used ${ticketType} ticket for Championship: ${t.name}`,
          createdAt: serverTime
        });
      } else if (entryFee > 0) {
        transaction.update(userRef, { balance: FieldValue.increment(-entryFee) });
        
        transaction.set(historyRef, {
          userId,
          username: profile.username || 'Warrior',
          amount: -entryFee,
          type: 'TOURNAMENT_ENTRY',
          description: `Entry fee for Championship: ${t.name}`,
          createdAt: serverTime
        });
      }

      transaction.update(tRef, { 
        [`currentRegistered.${th}`]: FieldValue.increment(1),
        totalRegistered: FieldValue.increment(1)
      });
      
      transaction.set(registrationRef, {
        tournamentId: championshipId,
        userId,
        username: profile.username || 'Warrior',
        tag: profile.tag || '',
        townHall: th,
        partyId: null,
        appliedForLeader: false,
        ticketUsed: usedTicket ? ticketType : null,
        registeredAt: serverTime
      });

      return { 
        success: true, 
        message: 'Successfully registered',
        tournamentName: t.name
      };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Championship Registration Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
