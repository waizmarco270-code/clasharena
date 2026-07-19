import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { challengeId, clanTag, clanLink } = await request.json();

    if (!challengeId || !clanTag || !clanLink) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const challengeRef = adminDb.collection('vs-challenges').doc(challengeId);
    
    await adminDb.runTransaction(async (transaction) => {
       const challengeSnap = await transaction.get(challengeRef);
       if (!challengeSnap.exists) throw new Error('Challenge not found');
       
       const challenge = challengeSnap.data()!;
       
       if (challenge.creatorId !== userId) {
          throw new Error('Only the creator can setup the Clan config.');
       }
       
       transaction.update(challengeRef, { clanTag, clanLink });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("VS Setup API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
