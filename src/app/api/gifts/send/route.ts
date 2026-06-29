import { auth } from '@clerk/nextjs/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export async function POST(request: Request) {
  try {
    const { userId: callerId } = await auth();
    if (!callerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const callerDoc = await adminDb.collection('users').doc(callerId).get();
    const callerData = callerDoc.data();
    const isSuperAdmin = callerId === MASTER_SUPER_ADMIN_ID || callerData?.isSuperAdmin === true;

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden. Super Admin only.' }, { status: 403 });
    }

    const { target, targetUserId, amount, message, action } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (action === 'deduct') {
      if (target !== 'individual' || !targetUserId) {
        return NextResponse.json({ error: 'Deductions must target a specific user' }, { status: 400 });
      }
      
      const targetUserRef = adminDb.collection('users').doc(targetUserId);
      await targetUserRef.update({
        balance: FieldValue.increment(-amount)
      });

      return NextResponse.json({ success: true, message: `Deducted ${amount} coins` });
    }

    if (action === 'gift') {
      const giftId = uuidv4();
      const serverTime = FieldValue.serverTimestamp();
      
      const giftData = {
        id: giftId,
        amount,
        message: message || 'You have received a Gift from Clash Arena!',
        createdAt: new Date().toISOString(), // Use ISO string to make arrayRemove easier later
      };

      if (target === 'global') {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await adminDb.collection('global-gifts').doc(giftId).set({
          ...giftData,
          type: 'global',
          createdAt: serverTime,
          expiresAt: expiresAt.toISOString(),
          totalClaims: 0
        });

        // Send broadcast push notification
        try {
          if (adminMessaging) {
            await adminMessaging.send({
              topic: 'broadcast',
              notification: {
                title: '🎁 Global Gift Received!',
                body: `Clash Arena just sent everyone ${amount} coins! Open the app to claim now.`
              },
              data: { type: 'global_gift' }
            });
          }
        } catch (e) {
          console.error("Failed to send broadcast:", e);
        }

        return NextResponse.json({ success: true, message: 'Global gift sent to all users' });
      } else {
        if (!targetUserId) return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });

        const targetUserRef = adminDb.collection('users').doc(targetUserId);
        const userSnap = await targetUserRef.get();
        if (!userSnap.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        await targetUserRef.update({
          pendingGifts: FieldValue.arrayUnion(giftData)
        });

        // Send individual push notification
        try {
          const userData = userSnap.data();
          const fcmTokens = userData?.fcmTokens || [];
          if (fcmTokens.length > 0 && adminMessaging) {
            await adminMessaging.sendMulticast({
              tokens: fcmTokens,
              notification: {
                title: '🎁 You received a Gift!',
                body: `You have received ${amount} coins. Open the app to claim it.`
              },
              data: { type: 'individual_gift' }
            });
          }
        } catch (e) {
          console.error("Failed to send individual push:", e);
        }

        return NextResponse.json({ success: true, message: 'Gift sent successfully' });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error("Gift API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
