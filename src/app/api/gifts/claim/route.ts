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

        if (giftData.status === 'closed') {
          throw new Error('This gift has been closed');
        }

        if (giftData.maxClaims > 0 && giftData.totalClaims >= giftData.maxClaims) {
          throw new Error('Gift claim limit reached');
        }

        if (giftData.expiresAt && new Date(giftData.expiresAt).getTime() < Date.now()) {
          throw new Error('This gift has expired');
        }

        const newTotalClaims = (giftData.totalClaims || 0) + 1;
        const updates: any = {
          totalClaims: FieldValue.increment(1),
          claimedBy: FieldValue.arrayUnion({
            userId,
            username: userData.username || 'Warrior',
            townHall: userData.townHall || 0
          })
        };

        if (giftData.maxClaims > 0 && newTotalClaims >= giftData.maxClaims) {
          updates.status = 'closed';
        }

        transaction.update(giftRef, updates);

        transaction.update(userRef, {
          balance: FieldValue.increment(giftData.amount),
          claimedGlobalGifts: FieldValue.arrayUnion(giftId)
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

        // Log transaction (gift-logs analytics update instead of wallet recharge-requests)
        const giftLogRef = adminDb.collection('gift-logs').doc(giftId);
        transaction.update(giftLogRef, {
          status: 'claimed',
          claimedAt: FieldValue.serverTimestamp()
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
