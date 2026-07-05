import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const { championshipId, targetPhase } = await req.json();

    if (!championshipId || !targetPhase) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const tRef = adminDb.collection('tournaments').doc(championshipId);

    await adminDb.runTransaction(async (t) => {
      const tSnap = await t.get(tRef);
      if (!tSnap.exists) throw new Error("Tournament not found");

      const updateData: any = { status: targetPhase };

      // 1. If reverting back to leader_selection (undoing Draft)
      if (['leader_selection', 'party_phase', 'registration'].includes(targetPhase)) {
        updateData.draftTurn = FieldValue.delete();

        // READS FIRST
        // Remove draftedTeam from all registrations
        const regsSnap = await t.get(tRef.collection('registrations'));
        
        // WRITES NEXT
        // Wipe Teams Subcollection
        const teamsA = tRef.collection('teams').doc('teamA');
        const teamsB = tRef.collection('teams').doc('teamB');
        t.delete(teamsA);
        t.delete(teamsB);

        for (const doc of regsSnap.docs) {
          if (doc.data().draftedTeam) {
            t.update(doc.ref, { draftedTeam: FieldValue.delete() });
          }
        }
      }

      // 2. If reverting back to party_phase (undoing Leader Selection)
      if (['party_phase', 'registration'].includes(targetPhase)) {
        updateData.teamALeader = FieldValue.delete();
        updateData.teamBLeader = FieldValue.delete();
        // Note: We don't automatically refund leader passes here.
        // Admins should manually refund leaders if they want them to get their money back.
      }

      // Execute final status update
      t.update(tRef, updateData);
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Revert Phase error:", error);
    return NextResponse.json({ error: error.message || 'Failed to revert phase' }, { status: 500 });
  }
}
