import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { userId } = getAuth(req as any);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { championshipId, targetPartyId } = body;
    if (!championshipId || !targetPartyId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const tRef = adminDb.collection('tournaments').doc(championshipId);
    
    return await adminDb.runTransaction(async (t) => {
      const tSnap = await t.get(tRef);
      if (!tSnap.exists) throw new Error("Tournament not found");
      const tData = tSnap.data()!;

      if (tData.status !== 'draft') throw new Error("Tournament is not in draft phase");

      const draftTurn = tData.draftTurn || 'teamA';
      const myTeamId = draftTurn;
      const myLeaderId = myTeamId === 'teamA' ? tData.teamALeader : tData.teamBLeader;

      if (userId !== myLeaderId) {
        throw new Error("It is not your turn to draft!");
      }

      // Fetch all registrations to find the targeted party/player
      const regsSnap = await t.get(adminDb.collection('tournaments').doc(championshipId).collection('registrations'));
      if (regsSnap.empty) throw new Error("No registrations found");

      const allRegs = regsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Target could be a partyId OR a single player's ID if they are solo.
      let targetUser = allRegs.find(r => r.id === targetPartyId);
      if (!targetUser) targetUser = allRegs.find(r => r.partyId === targetPartyId);
      if (!targetUser) throw new Error("Target player not found in registrations");

      let playersToDraft: any[] = [];
      if (targetUser.partyId) {
        playersToDraft = allRegs.filter(r => r.partyId === targetUser.partyId && !r.draftedTeam);
      } else {
        if (!targetUser.draftedTeam) playersToDraft = [targetUser];
      }

      if (playersToDraft.length === 0) {
        throw new Error("Target player/party has already been drafted.");
      }

      // Get current team
      const teamRef = tRef.collection('teams').doc(myTeamId);
      const teamSnap = await t.get(teamRef);
      const teamData = teamSnap.exists ? teamSnap.data()! : { id: myTeamId, leader: myLeaderId, members: [] };
      const currentMembers = teamData.members || [];

      // Get other team to balance the draft turn
      const otherTeamId = myTeamId === 'teamA' ? 'teamB' : 'teamA';
      const otherTeamRef = tRef.collection('teams').doc(otherTeamId);
      const otherTeamSnap = await t.get(otherTeamRef);
      const otherTeamData = otherTeamSnap.exists ? otherTeamSnap.data()! : { id: otherTeamId, members: [] };
      const otherMembers = otherTeamData.members || [];

      const maxPerTeam = Math.floor((tData.totalPlayers || 0) / 2);
      
      if (currentMembers.length + playersToDraft.length > maxPerTeam) {
        throw new Error(`Cannot draft this party. You only have ${maxPerTeam - currentMembers.length} slots left.`);
      }

      // 1. Mark players as drafted
      for (const p of playersToDraft) {
        const pRef = tRef.collection('registrations').doc(p.id);
        t.update(pRef, { draftedTeam: myTeamId });
      }

      // 2. Add players to the team document
      const newMembers = [...currentMembers, ...playersToDraft.map(p => ({
        userId: p.id,
        username: p.username || 'Unknown',
        townHall: p.townHall || 0,
        partyId: p.partyId || null,
        stars: 0,
        destruction: 0,
        time: 0
      }))];
      
      t.set(teamRef, { ...teamData, members: newMembers }, { merge: true });

      // 3. Figure out whose turn is next based on self-balancing size logic
      const sizeA = myTeamId === 'teamA' ? newMembers.length : otherMembers.length;
      const sizeB = myTeamId === 'teamB' ? newMembers.length : otherMembers.length;

      let nextTurn = draftTurn;
      if (sizeA < sizeB) nextTurn = 'teamA';
      else if (sizeB < sizeA) nextTurn = 'teamB';
      else {
        nextTurn = draftTurn === 'teamA' ? 'teamB' : 'teamA';
      }

      // Check if both teams are full
      const bothFull = (sizeA === maxPerTeam) && (sizeB === maxPerTeam);
      
      t.update(tRef, { 
        draftTurn: nextTurn,
        status: bothFull ? 'teams_locked' : 'draft'
      });

      return NextResponse.json({ success: true, draftedCount: playersToDraft.length, nextTurn, status: bothFull ? 'teams_locked' : 'draft' });
    });
  } catch (error: any) {
    console.error("Draft error:", error);
    return NextResponse.json({ error: error.message || 'Failed to execute draft pick' }, { status: 500 });
  }
}
