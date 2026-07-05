import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { championshipId } = await req.json();
    if (!championshipId) {
      return NextResponse.json({ error: 'Missing championshipId' }, { status: 400 });
    }

    const tRef = adminDb.collection('tournaments').doc(championshipId);
    
    return await adminDb.runTransaction(async (t) => {
      const tSnap = await t.get(tRef);
      if (!tSnap.exists) throw new Error("Tournament not found");
      const tData = tSnap.data()!;

      if (tData.status !== 'leader_selection') {
        throw new Error("Tournament must be in leader_selection phase to start draft.");
      }

      const leaderA = tData.teamALeader;
      const leaderB = tData.teamBLeader;

      if (!leaderA || !leaderB) {
        throw new Error("Both leaders must be assigned before starting the draft.");
      }

      // Fetch all registrations
      const regsSnap = await t.get(adminDb.collection('tournaments').doc(championshipId).collection('registrations'));
      if (regsSnap.empty) throw new Error("No registrations found");

      const allRegs = regsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Gather Leader A's party
      const regA = allRegs.find(r => r.id === leaderA);
      if (!regA) throw new Error("Team A Leader is not registered.");
      let teamAPlayers: any[] = [];
      if (regA.partyId) {
        teamAPlayers = allRegs.filter(r => r.partyId === regA.partyId);
      } else {
        teamAPlayers = [regA];
      }

      // Gather Leader B's party
      const regB = allRegs.find(r => r.id === leaderB);
      if (!regB) throw new Error("Team B Leader is not registered.");
      let teamBPlayers: any[] = [];
      if (regB.partyId) {
        teamBPlayers = allRegs.filter(r => r.partyId === regB.partyId);
      } else {
        teamBPlayers = [regB];
      }

      // 1. Mark players as drafted
      for (const p of teamAPlayers) {
        const pRef = tRef.collection('registrations').doc(p.id);
        t.update(pRef, { draftedTeam: 'teamA' });
      }
      for (const p of teamBPlayers) {
        const pRef = tRef.collection('registrations').doc(p.id);
        t.update(pRef, { draftedTeam: 'teamB' });
      }

      // 2. Set teams in the subcollection
      const mapMembers = (players: any[]) => players.map(p => ({
        userId: p.id,
        username: p.username || 'Unknown',
        townHall: p.townHall || 0,
        partyId: p.partyId || null,
        stars: 0,
        destruction: 0,
        time: 0
      }));

      t.set(tRef.collection('teams').doc('teamA'), {
        id: 'teamA',
        leader: leaderA,
        members: mapMembers(teamAPlayers)
      });

      t.set(tRef.collection('teams').doc('teamB'), {
        id: 'teamB',
        leader: leaderB,
        members: mapMembers(teamBPlayers)
      });

      // 3. Determine first turn
      let firstTurn = 'teamA';
      if (teamAPlayers.length > teamBPlayers.length) firstTurn = 'teamB';
      else if (teamBPlayers.length > teamAPlayers.length) firstTurn = 'teamA';
      else firstTurn = 'teamA'; // Default if equal

      // 4. Update tournament status and turn
      t.update(tRef, {
        status: 'draft',
        draftTurn: firstTurn
      });

      return NextResponse.json({ success: true, firstTurn });
    });
  } catch (error: any) {
    console.error("Start Draft error:", error);
    return NextResponse.json({ error: error.message || 'Failed to start draft' }, { status: 500 });
  }
}
