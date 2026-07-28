import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tournamentId, clanTag, clanLink } = await request.json();

    if (!tournamentId || !clanTag || !clanLink) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const tournamentRef = adminDb.collection('tournaments').doc(tournamentId);
    
    await adminDb.runTransaction(async (transaction) => {
       const tournamentSnap = await transaction.get(tournamentRef);
       if (!tournamentSnap.exists) throw new Error('Challenge not found');
       
       const tournament = tournamentSnap.data()!;
       
       if (tournament.creatorId !== userId) {
          throw new Error('Only the creator can setup the Clan config.');
       }
       
       transaction.update(tournamentRef, { clanTag, clanLink });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("VS Setup API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
