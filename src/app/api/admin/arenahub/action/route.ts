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
    const { challengeId, action, winnerId } = body;

    if (!challengeId || !action) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const challengeRef = adminDb.collection('vs-challenges').doc(challengeId);
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
      
      const batch = adminDb.batch();
      
      // Update Challenge
      batch.update(challengeRef, {
         status: 'completed',
         winnerId: winnerId,
         adminSettledBy: userId,
         settledAt: FieldValue.serverTimestamp()
      });

      // Award V-Cash
      batch.update(winnerRef, {
         vCashBalance: FieldValue.increment(pool)
      });

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
