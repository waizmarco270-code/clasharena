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

    const adminSnap = await adminDb.collection('users').doc(userId).get();
    if (!adminSnap.exists || (!adminSnap.data()?.isAdmin && !adminSnap.data()?.isSuperAdmin)) {
      return NextResponse.json({ error: 'Unauthorized: Admins only' }, { status: 403 });
    }

    const body = await request.json();
    const { withdrawalId, status, rejectionReason, proofUrl } = body;

    if (!withdrawalId || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
    }

    if (status === 'rejected' && !rejectionReason) {
      return NextResponse.json({ error: 'Rejection reason is required.' }, { status: 400 });
    }

    await adminDb.runTransaction(async (transaction) => {
      const withdrawRef = adminDb.collection('withdrawals').doc(withdrawalId);
      const withdrawSnap = await transaction.get(withdrawRef);
      
      if (!withdrawSnap.exists) {
        throw new Error('Withdrawal request not found.');
      }

      const withdrawData = withdrawSnap.data();
      if (withdrawData?.status !== 'pending') {
        throw new Error('Withdrawal request is not pending.');
      }

      const reqUserId = withdrawData.userId;
      const amount = withdrawData.amount;

      if (status === 'approved') {
        // Just mark as approved, funds were already deducted during request
        const updateData: any = {
          status: 'approved',
          processedAt: FieldValue.serverTimestamp(),
          processedBy: userId
        };
        
        if (proofUrl) {
          updateData.proofUrl = proofUrl;
        }

        transaction.update(withdrawRef, updateData);

        // Update the log status to approved
        const logsRef = adminDb.collection('recharge-requests');
        const query = await logsRef.where('withdrawalId', '==', withdrawalId).get();
        if (!query.empty) {
          transaction.update(query.docs[0].ref, {
            status: 'approved'
          });
        }
      } else if (status === 'rejected') {
        // Refund the user's V-Cash
        const userRef = adminDb.collection('users').doc(reqUserId);
        
        transaction.update(withdrawRef, {
          status: 'rejected',
          rejectionReason,
          processedAt: FieldValue.serverTimestamp(),
          processedBy: userId
        });

        transaction.update(userRef, {
          vCashBalance: FieldValue.increment(amount)
        });

        // Update original log to rejected
        const logsRef = adminDb.collection('recharge-requests');
        const query = await logsRef.where('withdrawalId', '==', withdrawalId).get();
        if (!query.empty) {
          transaction.update(query.docs[0].ref, {
            status: 'rejected',
            rejectionReason
          });
        }

        // Add a refund log
        const refundLogRef = adminDb.collection('recharge-requests').doc();
        transaction.set(refundLogRef, {
          userId: reqUserId,
          username: withdrawData.username || 'Unknown',
          amount: amount,
          currency: 'vcash',
          method: 'withdrawal_refund',
          status: 'approved',
          description: `Refund for rejected withdrawal: ${rejectionReason}`,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    });

    return NextResponse.json({ success: true, message: `Withdrawal successfully ${status}.` });
  } catch (error: any) {
    console.error('Withdrawal Approval API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
