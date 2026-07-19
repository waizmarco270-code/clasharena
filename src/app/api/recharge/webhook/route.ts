import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { processReferralReward } from '@/lib/referral-utils';

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      return NextResponse.json({ error: "Missing x-razorpay-signature header" }, { status: 400 });
    }

    if (!secret) {
      return NextResponse.json({ error: "RAZORPAY_WEBHOOK_SECRET is not configured on server" }, { status: 500 });
    }

    // 1. Verify webhook signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== signature) {
      console.warn("Razorpay Webhook Signature Mismatch!");
      return NextResponse.json({ error: "Invalid signature verification" }, { status: 400 });
    }

    // 2. Parse payload
    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // We only handle payment.captured (successful payment capture)
    if (event !== 'payment.captured') {
      return NextResponse.json({ success: true, message: `Event '${event}' ignored` });
    }

    const payment = payload.payload.payment.entity;
    const paymentId = payment.id;
    const orderId = payment.order_id;
    const userId = payment.notes?.userId;
    const amount = Number(payment.notes?.amount || (payment.amount / 100));
    const coins = Number(payment.notes?.coins || amount);
    const paymentType = payment.notes?.paymentType || 'recharge';
    const ticketType = payment.notes?.ticketType || 'none';
    const currency = payment.notes?.currency || 'coins';

    if (!userId || isNaN(amount) || amount <= 0) {
      console.warn("Razorpay Webhook missing notes or valid metadata:", paymentId);
      return NextResponse.json({ error: "Invalid transaction metadata in notes" }, { status: 400 });
    }

    if (!adminDb) {
      console.error("Firebase Admin DB helper is not initialized!");
      return NextResponse.json({ error: "Firebase DB uninitialized" }, { status: 500 });
    }

    // 3. Idempotency Check: Check if payment was already processed
    const requestRef = adminDb.collection('recharge-requests').doc(paymentId);
    const requestSnap = await requestRef.get();

    if (requestSnap.exists) {
      console.log(`Razorpay payment ${paymentId} already processed (idempotent block).`);
      return NextResponse.json({ success: true, message: "Transaction already completed previously" });
    }

    if (paymentType === 'website_cost') {
      // Process website infrastructure cost payment
      await adminDb.runTransaction(async (transaction: any) => {
        const analyticsRef = adminDb.collection('app-settings').doc('wallet-analytics');
        const analyticsSnap = await transaction.get(analyticsRef);
        const currentPaid = analyticsSnap.exists ? (analyticsSnap.data()?.paidWebsiteCost || 0) : 0;

        transaction.set(analyticsRef, {
          paidWebsiteCost: currentPaid + amount
        }, { merge: true });

        // Record as Website Cost Payment method
        transaction.set(requestRef, {
          userId,
          username: 'System Admin',
          amount,
          transactionId: paymentId,
          orderId: orderId || '',
          status: 'approved',
          method: 'Website Cost Payment',
          createdAt: FieldValue.serverTimestamp()
        });
      });

      console.log(`Successfully recorded website cost payment of ${amount} via Webhook transaction ${paymentId}.`);
      return NextResponse.json({ success: true, processed: true });
    }

    let isTicketFallback = false;

    // 4. Atomic balance increment and recharge log creation in transaction
    await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(userId);
      const userSnap = await transaction.get(userRef);
      const username = userSnap.exists ? (userSnap.data()?.username || 'Warrior') : 'Warrior';

      if (paymentType === 'ticket_purchase' && ticketType !== 'none') {
        const ticketRef = adminDb.collection('tickets').doc(ticketType);
        const ticketSnap = await transaction.get(ticketRef);
        const ticketData = ticketSnap.exists ? ticketSnap.data() : null;

        if (!ticketData || ticketData.stock <= 0 || !ticketData.isActive) {
          // OUT OF STOCK FALLBACK: Credit coins equivalent to the amount paid
          isTicketFallback = true;
          transaction.update(userRef, {
            balance: FieldValue.increment(coins || amount),
            totalCoinsEarned: FieldValue.increment(coins || amount)
          });
        } else {
          // VALID TICKET PURCHASE
          transaction.update(ticketRef, { 
            stock: FieldValue.increment(-1),
            totalSold: FieldValue.increment(1)
          });
          
          const buyerRef = ticketRef.collection('buyers').doc(paymentId);
          transaction.set(buyerRef, {
            userId,
            username,
            amount,
            purchasedAt: FieldValue.serverTimestamp()
          });

          transaction.update(userRef, {
            [`inventory.${ticketType}Tickets`]: FieldValue.increment(1),
            [`inventory.total${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)}TicketsEarned`]: FieldValue.increment(1)
          });
        }
      } else {
        // STANDARD RECHARGE
        if (currency === 'vcash') {
          transaction.update(userRef, {
            vCashBalance: FieldValue.increment(coins),
            unplayedBalance: FieldValue.increment(coins)
          });
        } else {
          transaction.update(userRef, {
            balance: FieldValue.increment(coins),
            totalCoinsEarned: FieldValue.increment(coins)
          });
        }
      }

      // Write recharge record log in recharge-requests collection
      transaction.set(requestRef, {
        userId,
        username,
        amount,
        coins,
        currency,
        paymentType,
        ticketType,
        transactionId: paymentId,
        orderId: orderId || '',
        status: 'approved',
        method: 'Automatic', // This acts as the source of truth
        createdAt: FieldValue.serverTimestamp()
      });

      // Process Squad Builder Referral Reward
      await processReferralReward(userId, coins, transaction);
    });

    console.log(`Successfully processed Webhook transaction ${paymentId}.`);
    return NextResponse.json({ success: true, processed: true });

  } catch (err: any) {
    console.error("Razorpay Webhook Internal Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
