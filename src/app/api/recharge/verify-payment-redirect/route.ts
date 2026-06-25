import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    if (!adminDb) {
      console.error("Firebase Admin DB helper is not initialized!");
      return new Response("Firebase Admin DB uninitialized", { status: 500 });
    }

    // 1. Parse url-encoded form body sent by Razorpay redirect
    const formData = await request.formData();
    const paymentId = formData.get('razorpay_payment_id') as string;
    const orderId = formData.get('razorpay_order_id') as string;
    const signature = formData.get('razorpay_signature') as string;

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret || !keyId) {
      return new Response("Razorpay keys missing on server", { status: 500 });
    }

    // 2. Verify signature
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== signature) {
      return new Response("Payment signature verification failed", { status: 400 });
    }

    // 3. Fetch order details from Razorpay API to retrieve metadata (notes)
    const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);
    const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
      headers: {
        'Authorization': authHeader
      }
    });

    const orderData = await orderRes.json();
    if (orderData.error) {
      return new Response(`Order retrieval failed: ${orderData.error.description}`, { status: 400 });
    }

    const userId = orderData.notes?.userId;
    const amount = Number(orderData.notes?.amount || 0);

    if (!userId || isNaN(amount) || amount <= 0) {
      return new Response("Invalid transaction metadata", { status: 400 });
    }

    // 4. Check if this payment transaction was already processed
    const requestRef = adminDb.collection('recharge-requests').doc(paymentId);
    const requestSnap = await requestRef.get();

    if (requestSnap.exists) {
      // Replay prevention: redirect to success page directly without double crediting
      return NextResponse.redirect(new URL(`/wallet?payment=success&amount=${amount}`, request.url), 303);
    }

    // 5. Run atomic transaction to update user balance and record the recharge request
    await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(userId);
      const userSnap = await transaction.get(userRef);
      const username = userSnap.exists ? (userSnap.data()?.username || 'Warrior') : 'Warrior';

      // Increment balance
      transaction.update(userRef, {
        balance: FieldValue.increment(amount)
      });

      // Write recharge record
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

    // 6. Redirect back to wallet with success triggers
    return NextResponse.redirect(new URL(`/wallet?payment=success&amount=${amount}`, request.url), 303);
  } catch (err: any) {
    console.error("Redirect payment error:", err);
    return new Response(`Server Error: ${err.message}`, { status: 500 });
  }
}
