import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { giftId, type } = await request.json();
    if (!giftId || !type) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

    const userRef = adminDb.collection('users').doc(userId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error('User profile not found');
      
      const userData = userSnap.data()!;

      if (type === 'global') {
        const claimed = userData.claimedGlobalGifts || [];
        if (claimed.includes(giftId)) {
          throw new Error('Gift already claimed');
        }

        const giftRef = adminDb.collection('global-gifts').doc(giftId);
        const giftSnap = await transaction.get(giftRef);
        if (!giftSnap.exists) throw new Error('Gift no longer available');

        const giftData = giftSnap.data()!;

        if (giftData.expiresAt && new Date(giftData.expiresAt).getTime() < Date.now()) {
          throw new Error('This gift has expired');
        }

        transaction.update(giftRef, {
          totalClaims: FieldValue.increment(1)
        });

        transaction.update(userRef, {
          balance: FieldValue.increment(giftData.amount),
          claimedGlobalGifts: FieldValue.arrayUnion(giftId)
        });

        // Log transaction
        const historyRef = adminDb.collection('recharge-requests').doc();
        transaction.set(historyRef, {
          userId,
          username: userData.username || 'Warrior',
          amount: giftData.amount,
          type: 'GIFT_CLAIM',
          description: `Claimed global gift: ${giftData.message || 'Reward'}`,
          status: 'approved',
          createdAt: FieldValue.serverTimestamp()
        });

        return { amount: giftData.amount };
      } else if (type === 'individual') {
        const pendingGifts = userData.pendingGifts || [];
        const gift = pendingGifts.find((g: any) => g.id === giftId);
        
        if (!gift) throw new Error('Gift not found or already claimed');

        transaction.update(userRef, {
          balance: FieldValue.increment(gift.amount),
          pendingGifts: FieldValue.arrayRemove(gift) // Requires exact object match
        });

        // Log transaction
        const historyRef = adminDb.collection('recharge-requests').doc();
        transaction.set(historyRef, {
          userId,
          username: userData.username || 'Warrior',
          amount: gift.amount,
          type: 'GIFT_CLAIM',
          description: `Claimed individual gift: ${gift.message || 'Reward'}`,
          status: 'approved',
          createdAt: FieldValue.serverTimestamp()
        });

        return { amount: gift.amount };
      }

      throw new Error('Invalid gift type');
    });

    return NextResponse.json({ success: true, amount: result.amount, message: `Successfully claimed ${result.amount} coins!` });

  } catch (error: any) {
    console.error("Gift Claim API Error:", error);
    // Return safe error to frontend
    return NextResponse.json({ error: error.message || 'Failed to claim gift' }, { status: 400 });
  }
}
