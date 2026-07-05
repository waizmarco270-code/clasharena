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
    const { championshipId, winningTeamId, top1UserId, top2UserId, top3UserId, top1RewardItem, top1RewardCoins, top2RewardItem, top2RewardCoins, top3RewardItem, top3RewardCoins, winnerRefundAmount } = body;

    if (!championshipId || !winningTeamId) {
      return NextResponse.json({ error: 'Missing championshipId or winningTeamId' }, { status: 400 });
    }

    const tRef = adminDb.collection('tournaments').doc(championshipId);
    const teamARef = tRef.collection('teams').doc('teamA');
    const teamBRef = tRef.collection('teams').doc('teamB');

    const result = await adminDb.runTransaction(async (transaction) => {
      const refsToGet: any[] = [tRef, teamARef, teamBRef];
      let top1Ref = null;
      if (top1UserId) {
        top1Ref = adminDb.collection('users').doc(top1UserId);
        refsToGet.push(top1Ref);
      }

      const snaps = await transaction.getAll(...refsToGet);
      const tSnap = snaps[0];
      const teamASnap = snaps[1];
      const teamBSnap = snaps[2];
      const top1Snap = top1Ref ? snaps[3] : null;

      if (!tSnap.exists) throw new Error('Championship not found');

      const winnerName = top1Snap?.exists ? top1Snap.data()?.username : null;

      const t = tSnap.data()!;
      if (t.status === 'completed') {
        throw new Error('Championship is already completed.');
      }
      if (t.status !== 'verification') {
        throw new Error('Championship must be in verification phase to finish.');
      }

      const teamAData = teamASnap.exists ? teamASnap.data() : { members: [] };
      const teamBData = teamBSnap.exists ? teamBSnap.data() : { members: [] };
      const allMembers = [...(teamAData?.members || []), ...(teamBData?.members || [])];

      const team = winningTeamId === 'teamA' ? teamAData : teamBData;
      const members = team?.members || [];
      const refundAmount = winnerRefundAmount !== undefined ? winnerRefundAmount : (t.entryFee || 0);
      const excludedIds = new Set();
      
      // Auto-exclude Top 1, 2, 3 from standard refund
      if (top1UserId) excludedIds.add(top1UserId);
      if (top2UserId) excludedIds.add(top2UserId);
      if (top3UserId) excludedIds.add(top3UserId);

      const serverTime = FieldValue.serverTimestamp();
      let refundCount = 0;
      
      const balanceIncrements: Record<string, number> = {};

      // 1. Give standard refunds to the rest of the winning team
      if (refundAmount > 0) {
        for (const member of members) {
          if (excludedIds.has(member.userId)) continue;

          balanceIncrements[member.userId] = (balanceIncrements[member.userId] || 0) + refundAmount;
          
          const historyRef = adminDb.collection('recharge-requests').doc();
          transaction.set(historyRef, {
            userId: member.userId,
            username: member.username,
            amount: refundAmount,
            type: 'TOURNAMENT_WIN_REFUND',
            method: 'refund',
            description: `Winner refund for Championship: ${t.name}`,
            createdAt: serverTime,
            status: 'approved'
          });
          
          refundCount++;
        }
      }

      // 2. Give specific rewards to Top 1, 2 and 3
      const processReward = (userId: string, amount: number, rank: string) => {
        if (!userId || !amount || amount <= 0) return;
        
        balanceIncrements[userId] = (balanceIncrements[userId] || 0) + amount;
        
        const historyRef = adminDb.collection('recharge-requests').doc();
        transaction.set(historyRef, {
          userId: userId,
          username: `Rank ${rank} Winner`, 
          amount: amount,
          type: 'TOURNAMENT_WIN_REWARD',
          method: 'refund',
          description: `${rank} Reward for Championship: ${t.name}`,
          createdAt: serverTime,
          status: 'approved'
        });
      };

      if (top1UserId && top1RewardCoins) processReward(top1UserId, Number(top1RewardCoins), 'Top 1');
      if (top2UserId && top2RewardCoins) processReward(top2UserId, Number(top2RewardCoins), 'Top 2');
      if (top3UserId && top3RewardCoins) processReward(top3UserId, Number(top3RewardCoins), 'Top 3');
      
      const topWinners = new Set([top1UserId, top2UserId, top3UserId].filter(Boolean));
      const allUserIds = new Set([ ...allMembers.map((m:any)=>m.userId), ...Object.keys(balanceIncrements) ]);

      // 3. Batch apply Profile Updates (Stats + Balances)
      for (const uid of Array.from(allUserIds)) {
         if (!uid) continue;
         const userRef = adminDb.collection('users').doc(uid as string);
         const updateObj: any = {};
         
         if (topWinners.has(uid)) {
           updateObj.tournamentsWon = FieldValue.increment(1);
         }
         
         if (allMembers.find((m:any) => m.userId === uid)) {
           updateObj.tournamentsPlayed = FieldValue.increment(1);
         }

         if (balanceIncrements[uid as string]) {
           updateObj.balance = FieldValue.increment(balanceIncrements[uid as string]);
         }

         if (Object.keys(updateObj).length > 0) {
           transaction.update(userRef, updateObj);
         }
      }

      // Mark tournament completed
      transaction.update(tRef, { 
        status: 'completed',
        winningTeamId,
        top1UserId: top1UserId || null,
        top2UserId: top2UserId || null,
        top3UserId: top3UserId || null,
        top1RewardItem: top1RewardItem || null,
        top1RewardCoins: top1RewardCoins || null,
        top2RewardItem: top2RewardItem || null,
        top3RewardItem: top3RewardItem || null,
        winnerName: winnerName,
        loungeClosed: false,
        completedAt: serverTime
      });

      return { 
        success: true, 
        message: 'Tournament completed successfully',
        refundedPlayers: refundCount,
        refundAmount
      };
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Championship Finish Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
