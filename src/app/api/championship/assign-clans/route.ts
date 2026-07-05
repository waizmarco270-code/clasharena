import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { championshipId, teamAClanLink, teamBClanLink } = await req.json();

    if (!championshipId || !teamAClanLink || !teamBClanLink) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const tRef = adminDb.collection('tournaments').doc(championshipId);
    
    await adminDb.runTransaction(async (t) => {
      const tSnap = await t.get(tRef);
      if (!tSnap.exists) throw new Error("Tournament not found");

      t.update(tRef, {
        status: 'clan_assigned',
        teamAClanLink,
        teamBClanLink
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Assign Clans error:", error);
    return NextResponse.json({ error: error.message || 'Failed to assign clans' }, { status: 500 });
  }
}
