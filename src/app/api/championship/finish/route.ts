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
    const { championshipId, winningTeamId, top1UserId, top2UserId, top3UserId, top2RewardCoins, top3RewardCoins, top1RewardItem, winnerRefundAmount } = body;

    if (!championshipId || !winningTeamId) {
      return NextResponse.json({ error: 'Missing championshipId or winningTeamId' }, { status: 400 });
    }

    const tRef = adminDb.collection('tournaments').doc(championshipId);
    const teamRef = tRef.collection('teams').doc(winningTeamId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const [tSnap, teamSnap] = await transaction.getAll(tRef, teamRef);

      if (!tSnap.exists) throw new Error('Championship not found');
      if (!teamSnap.exists) throw new Error('Winning team not found');

      const t = tSnap.data()!;
      if (t.status === 'completed') {
        throw new Error('Championship is already completed.');
      }
      if (t.status !== 'verification') {
        throw new Error('Championship must be in verification phase to finish.');
      }

      const team = teamSnap.data()!;
      const members = team.members || [];
      const refundAmount = winnerRefundAmount !== undefined ? winnerRefundAmount : (t.entryFee || 0);
      const excludedIds = new Set();
      
      // Auto-exclude Top 1, 2, 3 from standard refund
      if (top1UserId) excludedIds.add(top1UserId);
      if (top2UserId) excludedIds.add(top2UserId);
      if (top3UserId) excludedIds.add(top3UserId);

      const serverTime = FieldValue.serverTimestamp();
      let refundCount = 0;

      // 1. Give standard refunds to the rest of the winning team
      if (refundAmount > 0) {
        for (const member of members) {
          if (excludedIds.has(member.userId)) continue;

          const userRef = adminDb.collection('users').doc(member.userId);
          const historyRef = adminDb.collection('recharge-requests').doc();

          transaction.update(userRef, { balance: FieldValue.increment(refundAmount) });
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

      // 2. Give specific rewards to Top 2 and Top 3 (even if they are from losing team)
      const processReward = (userId: string, amount: number, rank: string) => {
        if (!userId || !amount || amount <= 0) return;
        const userRef = adminDb.collection('users').doc(userId);
        const historyRef = adminDb.collection('recharge-requests').doc();
        transaction.update(userRef, { balance: FieldValue.increment(amount) });
        transaction.set(historyRef, {
          userId: userId,
          username: `Rank ${rank} Winner`, // The real username isn't available here instantly if from losing team, but ID is.
          amount: amount,
          type: 'TOURNAMENT_WIN_REWARD',
          method: 'refund',
          description: `${rank} Reward for Championship: ${t.name}`,
          createdAt: serverTime,
          status: 'approved'
        });
      };

      if (top2UserId && top2RewardCoins) processReward(top2UserId, Number(top2RewardCoins), 'Top 2');
      if (top3UserId && top3RewardCoins) processReward(top3UserId, Number(top3RewardCoins), 'Top 3');

      // Mark tournament completed
      transaction.update(tRef, { 
        status: 'completed',
        winningTeamId,
        top1UserId: top1UserId || null,
        top2UserId: top2UserId || null,
        top3UserId: top3UserId || null,
        top1RewardItem: top1RewardItem || null,
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
