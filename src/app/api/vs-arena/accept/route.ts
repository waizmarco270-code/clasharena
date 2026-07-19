import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { challengeId } = await request.json();

    if (!challengeId) {
      return NextResponse.json({ error: 'Missing challenge ID' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    const challengeRef = adminDb.collection('vs-challenges').doc(challengeId);

    const txResult = await adminDb.runTransaction(async (transaction) => {
      const challengeSnap = await transaction.get(challengeRef);
      if (!challengeSnap.exists) throw new Error('Challenge not found');
      
      const challenge = challengeSnap.data()!;
      
      if (challenge.status !== 'open') {
        throw new Error('This challenge is no longer open.');
      }
      
      if (challenge.creatorId === userId) {
        throw new Error('You cannot accept your own challenge.');
      }

      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error('User not found');
      
      const userData = userSnap.data()!;
      const vCash = userData.vCashBalance || 0;
      const wager = challenge.wager;
      
      if (vCash < wager) {
        throw new Error('Insufficient V-Cash balance.');
      }

      if (Number(userData.townHall) !== Number(challenge.reqTh)) {
        throw new Error(`Town Hall mismatch. Your active profile is TH ${userData.townHall}, but this match requires TH ${challenge.reqTh}. Please change your Active Default Slot first.`);
      }
      
      // Deduct wager
      const unplayed = userData.unplayedBalance || 0;
      const unplayedDeduction = Math.min(unplayed, wager);
      
      transaction.update(userRef, {
        vCashBalance: FieldValue.increment(-wager),
        unplayedBalance: FieldValue.increment(-unplayedDeduction)
      });
      
      // Update Challenge
      transaction.update(challengeRef, {
        acceptorId: userId,
        acceptorName: userData.username || 'Warrior',
        acceptorAvatar: userData.avatarUrl || '',
        pool: wager * 2,
        status: 'active',
        startedAt: new Date().toISOString()
      });
      
      // Notify the creator (in-app)
      const notifRef = adminDb.collection('notifications').doc();
      transaction.set(notifRef, {
        userId: challenge.creatorId,
        title: 'Challenge Accepted! ⚔️',
        message: `${userData.username || 'A Warrior'} has accepted your VS Battle! The match has officially started.`,
        type: 'battle_started',
        link: `/vs-arena/battle/${challengeId}`,
        read: false,
        createdAt: FieldValue.serverTimestamp()
      });
      
      return { creatorId: challenge.creatorId, acceptorName: userData.username || 'A Warrior' };
    });

    // Send direct Push Notification to Creator (outside transaction)
    try {
      const { adminDb, adminMessaging } = await import('@/lib/firebase-admin');
      if (adminMessaging) {
        const creatorDoc = await adminDb.collection('users').doc(txResult.creatorId).get();
        const creatorTokens = creatorDoc.data()?.fcmTokens;
        if (Array.isArray(creatorTokens) && creatorTokens.length > 0) {
          await adminMessaging.sendEachForMulticast({
            tokens: creatorTokens,
            notification: {
              title: 'Challenge Accepted! ⚔️',
              body: `${txResult.acceptorName} has accepted your VS Battle! Open the app to play!`
            },
            data: {
              url: `/vs-arena/battle/${challengeId}`
            }
          });
          console.log(`Direct push notification sent to creator ${txResult.creatorId}`);
        }
      }
    } catch (err) {
      console.error("VS Accept Push Notification Error:", err);
    }

    return NextResponse.json({ success: true, challengeId });
  } catch (error: any) {
    console.error("VS Accept API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
