import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { championshipId } = await req.json();

    if (!championshipId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const regRef = adminDb.collection(`tournaments/${championshipId}/registrations`).doc(userId);
    
    await adminDb.runTransaction(async (t) => {
      const regSnap = await t.get(regRef);
      if (!regSnap.exists) throw new Error("Registration not found");

      t.update(regRef, {
        clanJoined: true
      });
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Join Clan error:", error);
    return NextResponse.json({ error: error.message || 'Failed to record clan join' }, { status: 500 });
  }
}
