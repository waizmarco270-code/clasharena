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

    const body = await request.json();
    const { target, targetUserId, amount, message, action, limit, expireDays, expireHours, expireMins, rewardType = 'coins' } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (action === 'deduct') {
      if (target !== 'individual' || !targetUserId) {
        return NextResponse.json({ error: 'Deductions must target a specific user' }, { status: 400 });
      }
      
      const targetUserRef = adminDb.collection('users').doc(targetUserId);
      const updateData: any = {};
      
      if (rewardType === 'coins') {
        updateData.balance = FieldValue.increment(-amount);
      } else {
        updateData[`inventory.${rewardType}Tickets`] = FieldValue.increment(-amount);
      }
      
      await targetUserRef.update(updateData);

      const messageType = rewardType === 'coins' ? 'coins' : `${rewardType} tickets`;
      return NextResponse.json({ success: true, message: `Deducted ${amount} ${messageType}` });
    }

    if (action === 'gift') {
      const giftId = uuidv4();
      const serverTime = FieldValue.serverTimestamp();
      
      const giftData = {
        id: giftId,
        amount,
        rewardType,
        message: message || 'You have received a Gift from Clash Arena!',
        createdAt: new Date().toISOString(), // Use ISO string to make arrayRemove easier later
      };

      if (target === 'global') {
        const expiresAt = new Date();
        const days = Number(expireDays) || 0;
        const hours = Number(expireHours) || 0;
        const mins = Number(expireMins) || 0;

        if (days > 0 || hours > 0 || mins > 0) {
          expiresAt.setDate(expiresAt.getDate() + days);
          expiresAt.setHours(expiresAt.getHours() + hours);
          expiresAt.setMinutes(expiresAt.getMinutes() + mins);
        } else {
          expiresAt.setDate(expiresAt.getDate() + 7); // Default 7 days
        }

        await adminDb.collection('global-gifts').doc(giftId).set({
          ...giftData,
          type: 'global',
          createdAt: serverTime,
          expiresAt: expiresAt.toISOString(),
          totalClaims: 0,
          maxClaims: Number(limit) || 0,
          status: 'active',
          claimedBy: []
        });

        // Send broadcast push notification
        try {
          if (adminMessaging) {
            await adminMessaging.send({
              topic: 'broadcast',
              notification: {
                title: '🎁 Global Gift Received!',
                body: `Clash Arena just sent everyone ${amount} ${rewardType === 'coins' ? 'coins' : rewardType + ' tickets'}! Open the app to claim now.`
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

        const userData = userSnap.data();

        await targetUserRef.update({
          pendingGifts: FieldValue.arrayUnion(giftData)
        });

        // Add to gift-logs for Individual Analytics
        await adminDb.collection('gift-logs').doc(giftId).set({
          giftId,
          targetUserId,
          targetUsername: userData?.username || 'Warrior',
          amount,
          rewardType,
          message: giftData.message,
          status: 'pending',
          sentAt: serverTime,
        });

        // Send individual push notification
        try {
          const fcmTokens = userData?.fcmTokens || [];
          if (fcmTokens.length > 0 && adminMessaging) {
            await adminMessaging.sendMulticast({
              tokens: fcmTokens,
              notification: {
                title: '🎁 You received a Gift!',
                body: `You have received ${amount} ${rewardType === 'coins' ? 'coins' : rewardType + ' tickets'}. Open the app to claim it.`
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
