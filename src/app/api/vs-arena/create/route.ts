import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { wager, mode, creatorTH } = await request.json();

    if (!wager || wager < 30) {
      return NextResponse.json({ error: 'Minimum wager is 30 V-Cash' }, { status: 400 });
    }

    if (mode !== '1v1') {
      return NextResponse.json({ error: 'Only 1v1 mode is supported currently.' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    
    // Check daily creation limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDayStr = today.toISOString();
    
    const challengesQuery = await adminDb.collection('vs-challenges')
      .where('creatorId', '==', userId)
      .get();
      
    const todayCount = challengesQuery.docs.filter(doc => {
      const data = doc.data();
      return data.createdAt && data.createdAt >= startOfDayStr;
    }).length;
      
    if (todayCount >= 3) {
      return NextResponse.json({ error: 'Daily creation limit reached (Max 3/day). You can still accept unlimited challenges.' }, { status: 429 });
    }

    const challengeId = uuidv4();

    await adminDb.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error('User not found');
      
      const userData = userSnap.data()!;
      const vCash = userData.vCashBalance || 0;
      
      if (vCash < wager) {
        throw new Error('Insufficient V-Cash balance.');
      }
      
      const unplayed = userData.unplayedBalance || 0;
      const unplayedDeduction = Math.min(unplayed, wager);
      
      const activeTH = Number(userData.townHall);
      if (!activeTH) {
        throw new Error('You must set up your Town Hall profile first.');
      }
      
      if (creatorTH && Number(creatorTH) !== activeTH) {
        throw new Error(`Your active profile is TH ${activeTH}. You cannot create a TH ${creatorTH} match. Please change your Active Default Slot first.`);
      }

      // Deduct wager
      transaction.update(userRef, {
        vCashBalance: FieldValue.increment(-wager),
        unplayedBalance: FieldValue.increment(-unplayedDeduction)
      });
      
      // Create Challenge
      const challengeRef = adminDb.collection('vs-challenges').doc(challengeId);
      transaction.set(challengeRef, {
        creatorId: userId,
        creatorName: userData.username || 'Warrior',
        creatorAvatar: userData.avatarUrl || '',
        reqTh: activeTH,
        wager: wager,
        mode: mode,
        pool: wager, // currently holds 1x wager
        status: 'open',
        createdAt: new Date().toISOString()
      });
      
      
    });

    // Zero-read push notification broadcast to the specific Town Hall topic
    try {
      const { adminMessaging } = await import('@/lib/firebase-admin');
      if (adminMessaging) {
        await adminMessaging.send({
          topic: `th_${activeTH}_alerts`,
          notification: {
            title: `New TH-${activeTH} Match Available! ⚔️`,
            body: `A new VS Battle for ${wager} ⚡ was just created. Open the arena to accept it before someone else does!`
          },
          data: {
            url: `/vs-arena/battle/${challengeId}`
          }
        });
        console.log(`Broadcasted new match notification to topic: th_${activeTH}_alerts`);
      }
    } catch (err) {
      console.error("FCM Topic Broadcast Error:", err);
    }

    return NextResponse.json({ success: true, challengeId });
  } catch (error: any) {
    console.error("VS Create API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
