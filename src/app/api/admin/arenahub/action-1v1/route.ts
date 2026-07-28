import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return new NextResponse("User not found", { status: 404 });
    }

    const userData = userDoc.data();
    if (userData?.isAdmin !== true && userData?.isSuperAdmin !== true) {
      return new NextResponse("Forbidden: Admin access required", { status: 403 });
    }

    const body = await req.json();
    const { tournamentId, action, winnerId } = body;

    if (!tournamentId || !action) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const challengeRef = adminDb.collection('tournaments').doc(tournamentId);
    const challengeSnap = await challengeRef.get();

    if (!challengeSnap.exists) {
      return new NextResponse("Challenge not found", { status: 404 });
    }

    const challenge = challengeSnap.data();

    // Prevent action if already completed or cancelled
    if (challenge?.status === 'completed' || challenge?.status === 'cancelled') {
       return new NextResponse("Challenge already settled", { status: 400 });
    }

    if (action === 'force_win' && winnerId) {
      // Award winner, update status to completed
      const pool = challenge?.pool || 0;
      const winnerRef = adminDb.collection('users').doc(winnerId);
      const winnerDoc = await winnerRef.get();
      
      const batch = adminDb.batch();
      
      // Update Challenge
      batch.update(challengeRef, {
         status: 'completed',
         winnerId: winnerId,
         winnerName: winnerDoc.data()?.username || 'Winner',
         adminSettledBy: userId,
         settledAt: FieldValue.serverTimestamp()
      });

      // Create reward claim if needed
      if (challenge?.rewardType) {
        const claimRef = adminDb.collection('reward-claims').doc();
        const isAutoCoin = challenge.rewardType === 'coin';
        const isAutoTicket = challenge.rewardType === 'ticket';
        
        const claimData = {
          tournamentId,
          tournamentName: challenge.name || '',
          userId: winnerId,
          username: winnerDoc.data()?.username || '',
          rewardType: challenge.rewardType || '',
          rewardValue: challenge.rewardValue || '0',
          rewardItemName: challenge.rewardItemName || '',
          rewardImageUrl: challenge.rewardImageUrl || '',
          status: isAutoCoin || isAutoTicket ? 'completed' : 'pending',
          upiId: '',
          upiName: '',
          upiQrUrl: '',
          proofImageUrl: '',
          proofImageUrl2: '',
          createdAt: FieldValue.serverTimestamp()
        };

        if (isAutoCoin) {
          const amount = parseInt(challenge.rewardValue) || 0;
          batch.update(winnerRef, {
            balance: FieldValue.increment(amount),
            earnings: FieldValue.increment(amount)
          });
          claimData.completedAt = FieldValue.serverTimestamp() as any;
        } else if (isAutoTicket) {
          const amount = parseInt(challenge.rewardValue) || 1;
          const tType = challenge.rewardTicketType || 'bronze';
          batch.update(winnerRef, {
            [`inventory.${tType}Tickets`]: FieldValue.increment(amount)
          });
          
          const logRef = adminDb.collection('recharge-requests').doc();
          batch.set(logRef, {
            userId: winnerId,
            username: winnerDoc.data()?.username || 'Warrior',
            amount: 0,
            type: 'TOURNAMENT_WIN_REWARD',
            method: 'ticket_reward',
            description: `Won ${amount} ${tType} Ticket(s) in Arena: ${challenge.name}`,
            createdAt: FieldValue.serverTimestamp(),
            status: 'approved'
          });
          claimData.completedAt = FieldValue.serverTimestamp() as any;
        }
        batch.set(claimRef, claimData);
      }

      await batch.commit();
      return NextResponse.json({ success: true, message: 'Force win applied successfully' });
    }

    if (action === 'cancel') {
      // Refund both users their original wager
      const wager = challenge?.wager || 0;
      const creatorRef = adminDb.collection('users').doc(challenge!.creatorId);
      const acceptorRef = adminDb.collection('users').doc(challenge!.acceptorId);
      
      const batch = adminDb.batch();
      
      // Update Challenge
      batch.update(challengeRef, {
         status: 'cancelled',
         adminSettledBy: userId,
         settledAt: FieldValue.serverTimestamp()
      });

      // Refund V-Cash to Creator
      batch.update(creatorRef, {
         vCashBalance: FieldValue.increment(wager),
         unplayedBalance: FieldValue.increment(wager)
      });

      // Refund V-Cash to Acceptor
      if (challenge?.acceptorId) {
        batch.update(acceptorRef, {
           vCashBalance: FieldValue.increment(wager),
           unplayedBalance: FieldValue.increment(wager)
        });
      }

      await batch.commit();
      return NextResponse.json({ success: true, message: 'Battle cancelled and refunded' });
    }

    return new NextResponse("Invalid action", { status: 400 });

  } catch (error: any) {
    console.error("Admin Arena Action error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
