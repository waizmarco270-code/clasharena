import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, upiId, upiQrUrl } = body;

    if (!amount || typeof amount !== 'number' || amount < 100 || amount > 300) {
      return NextResponse.json({ error: 'Withdrawal amount must be between 100 and 300 V-Cash.' }, { status: 400 });
    }

    if (!upiId || typeof upiId !== 'string' || upiId.length < 5) {
      return NextResponse.json({ error: 'Valid UPI ID is required.' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userSnap.data();
    const vCashBalance = userData?.vCashBalance || 0;

    if (vCashBalance < amount) {
      return NextResponse.json({ error: 'Insufficient V-Cash balance.' }, { status: 400 });
    }

    // Check cooldown / pending withdrawals
    const withdrawalsRef = adminDb.collection('withdrawals');
    const recentWithdrawalsSnap = await withdrawalsRef
      .where('userId', '==', userId)
      .get();

    if (!recentWithdrawalsSnap.empty) {
      // Sort in memory to avoid needing a composite index
      const sortedWithdrawals = recentWithdrawalsSnap.docs
        .map(d => ({ ...d.data(), id: d.id }))
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });

      // Filter only successful or pending requests for cooldown logic, ignore rejected
      const nonRejectedWithdrawals = sortedWithdrawals.filter(d => d.status !== 'rejected');
      const lastWithdrawal = nonRejectedWithdrawals[0];
      
      if (lastWithdrawal) {
        // If there is an active pending withdrawal, block a new one
        if (lastWithdrawal.status === 'pending') {
           return NextResponse.json({ error: 'You already have a pending withdrawal request. Please wait for it to be processed.' }, { status: 400 });
        }

        // 48-hour cooldown rule for approved/completed withdrawals
        const lastDate = lastWithdrawal.createdAt?.toDate ? lastWithdrawal.createdAt.toDate() : null;
        if (lastDate) {
          const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
          if (hoursSince < 48) {
            const remainingHours = Math.ceil(48 - hoursSince);
            return NextResponse.json({ error: `You must wait ${remainingHours} hours before requesting another withdrawal.` }, { status: 400 });
          }
        }
      }
    }

    // Perform the withdrawal transaction
    await adminDb.runTransaction(async (transaction) => {
      const tUserSnap = await transaction.get(userRef);
      const currentVCash = tUserSnap.data()?.vCashBalance || 0;
      
      if (currentVCash < amount) {
        throw new Error('Insufficient V-Cash balance during transaction.');
      }

      const withdrawRef = withdrawalsRef.doc();
      const withdrawId = withdrawRef.id;

      const unplayed = tUserSnap.data()?.unplayedBalance || 0;
      const unplayedWithdrawn = Math.min(amount, unplayed);
      const winningsWithdrawn = amount - unplayedWithdrawn;
      
      const fee = Math.floor(winningsWithdrawn * 0.20);
      const payableAmount = amount - fee;

      // Create withdrawal request
      transaction.set(withdrawRef, {
        userId,
        username: userData?.username || 'Unknown',
        amount,
        unplayedWithdrawn,
        winningsWithdrawn,
        fee,
        payableAmount,
        currency: 'vcash',
        upiId,
        upiQrUrl: upiQrUrl || null,
        status: 'pending', // pending, approved, rejected
        createdAt: FieldValue.serverTimestamp(),
      });

      // Deduct balance
      transaction.update(userRef, {
        vCashBalance: FieldValue.increment(-amount),
        unplayedBalance: FieldValue.increment(-unplayedWithdrawn)
      });
      
      // Log the deduction for audit
      const logRef = adminDb.collection('recharge-requests').doc();
      transaction.set(logRef, {
        userId,
        username: userData?.username || 'Unknown',
        amount: -amount,
        currency: 'vcash',
        method: 'withdrawal_request',
        status: 'pending',
        withdrawalId: withdrawId,
        description: 'V-Cash Withdrawal to UPI',
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ success: true, message: 'Withdrawal request submitted successfully.' });
  } catch (error: any) {
    console.error('Withdrawal API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
