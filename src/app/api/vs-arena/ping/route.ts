import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { challengeId, targetUserId } = await request.json();
    if (!challengeId || !targetUserId) {
      return NextResponse.json({ error: 'Missing challengeId or targetUserId' }, { status: 400 });
    }

    // Fetch the challenge to verify participation (1 Read)
    const challengeRef = adminDb.collection('vs-challenges').doc(challengeId);
    const challengeSnap = await challengeRef.get();
    
    if (!challengeSnap.exists) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }
    
    const challenge = challengeSnap.data()!;
    
    // Security checks
    if (challenge.status !== 'active') {
      return NextResponse.json({ error: 'You can only ping opponents in active matches.' }, { status: 400 });
    }
    
    if (userId !== challenge.creatorId && userId !== challenge.acceptorId) {
      return NextResponse.json({ error: 'You are not a participant in this match.' }, { status: 403 });
    }

    if (targetUserId !== challenge.creatorId && targetUserId !== challenge.acceptorId) {
      return NextResponse.json({ error: 'Invalid target user.' }, { status: 400 });
    }

    if (userId === targetUserId) {
      return NextResponse.json({ error: 'You cannot ping yourself.' }, { status: 400 });
    }

    // Fetch target user's FCM tokens (1 Read)
    const targetUserSnap = await adminDb.collection('users').doc(targetUserId).get();
    const targetTokens = targetUserSnap.data()?.fcmTokens;

    if (!Array.isArray(targetTokens) || targetTokens.length === 0) {
      return NextResponse.json({ error: 'Opponent does not have push notifications enabled.' }, { status: 400 });
    }

    // Send push notification (0 DB Reads/Writes)
    if (adminMessaging) {
      const senderName = userId === challenge.creatorId ? challenge.creatorName : challenge.acceptorName;
      await adminMessaging.sendEachForMulticast({
        tokens: targetTokens,
        notification: {
          title: 'You are being PINGED! 🔔',
          body: `${senderName} is waiting for you in the Battle Room! Open the app now to play your match.`,
        },
        data: {
          url: `/vs-arena/battle/${challengeId}`
        }
      });
      console.log(`Pinged user ${targetUserId} for match ${challengeId}`);
    }

    // Return success (we do NOT write to DB to track cooldowns, relying on frontend to optimize Firebase writes)
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("VS Ping API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
