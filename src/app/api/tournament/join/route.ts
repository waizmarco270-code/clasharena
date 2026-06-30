import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { auth } from '@clerk/nextjs/server';
import { StreamChat } from 'stream-chat';

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
    const historyRef = adminDb.collection('recharge-requests').doc();

    const result = await adminDb.runTransaction(async (transaction) => {
      // ... transaction code remains unchanged ...
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
          username: profile.username || 'Warrior',
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

      return { 
        success: true, 
        message: 'Successfully registered',
        isFull: t.currentPlayers + 1 >= t.maxPlayers,
        tournamentName: t.name,
        startTime: t.startTime
      };
    });

    if (result.success) {
      // Background sync to Stream Chat to enable mentions for everyone
      const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
      const apiSecret = process.env.STREAM_SECRET_KEY || process.env.STREAM_SECRET;
      
      if (apiKey && apiSecret) {
        try {
          const serverClient = StreamChat.getInstance(apiKey, apiSecret);
          const safeChannelId = `tournament_${tournamentId.toLowerCase()}`;
          const channel = serverClient.channel('gaming', safeChannelId);
          await channel.create();
          await channel.addMembers([userId]);
        } catch (streamErr) {
          console.error("Stream sync error:", streamErr);
          // Do not fail the transaction just because chat failed
        }
      }

      // If tournament just got full, automate push notifications!
      if (result.isFull) {
        try {
          const apiUrl = new URL('/api/notifications/send', req.url).toString();
          const cookieHeader = req.headers.get('cookie') || '';
          
          // 1. Notify Admins
          fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'cookie': cookieHeader },
            body: JSON.stringify({
              audience: 'admins',
              title: 'Tournament Full ⚔️',
              body: `Arena "${result.tournamentName}" has reached maximum capacity!`,
              redirectUrl: `/arena/tournament/${tournamentId}`
            })
          }).catch(console.error);

          // 2. Notify Registered Players
          fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'cookie': cookieHeader },
            body: JSON.stringify({
              audience: 'tournament_players',
              title: 'Tournament Full! Get Ready! ⚔️',
              body: `Arena "${result.tournamentName}" is fully booked. Battle starts at ${new Date(result.startTime).toLocaleString('en-US', {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}. Prepare for battle!`,
              redirectUrl: `/arena/tournament/${tournamentId}`,
              data: { tournamentId }
            })
          }).catch(console.error);
        } catch (pushErr) {
          console.error("Failed to automate push notifications:", pushErr);
        }
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Registration Transaction Error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
