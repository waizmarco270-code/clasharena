import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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

    // 4. Atomic balance increment and recharge log creation in transaction
    await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(userId);
      const userSnap = await transaction.get(userRef);
      const username = userSnap.exists ? (userSnap.data()?.username || 'Warrior') : 'Warrior';

      // Increment balance in users collection
      transaction.update(userRef, {
        balance: FieldValue.increment(amount)
      });

      // Write recharge record log in recharge-requests collection
      transaction.set(requestRef, {
        userId,
        username,
        amount,
        transactionId: paymentId,
        orderId: orderId || '',
        status: 'approved',
        method: 'Automatic',
        createdAt: new Date().toISOString()
      });
    });

    console.log(`Successfully credited ${amount} coins to ${userId} via Webhook transaction ${paymentId}.`);
    return NextResponse.json({ success: true, processed: true });

  } catch (err: any) {
    console.error("Razorpay Webhook Internal Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
