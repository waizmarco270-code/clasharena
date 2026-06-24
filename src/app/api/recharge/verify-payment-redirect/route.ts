import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

export async function POST(request: Request) {
  try {
    // Initialize Firebase Client SDK inside the request handler
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const db = getFirestore(app);

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
    const requestRef = doc(db, 'recharge-requests', paymentId);
    const requestSnap = await getDoc(requestRef);

    if (requestSnap.exists()) {
      // Replay prevention: redirect to success page directly without double crediting
      return NextResponse.redirect(new URL(`/wallet?payment=success&amount=${amount}`, request.url));
    }

    // 5. Fetch user profile to get actual username
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const username = userSnap.exists() ? (userSnap.data()?.username || 'Warrior') : 'Warrior';

    // 6. Update user's coin balance
    await updateDoc(userRef, {
      balance: increment(amount)
    });

    // 7. Write the transaction audit record
    await setDoc(requestRef, {
      userId,
      username,
      amount,
      transactionId: paymentId,
      status: 'approved',
      method: 'Automatic',
      createdAt: new Date().toISOString()
    });

    // 8. Redirect back to wallet with success triggers
    return NextResponse.redirect(new URL(`/wallet?payment=success&amount=${amount}`, request.url), 303);
  } catch (err: any) {
    console.error("Redirect payment error:", err);
    return new Response(`Server Error: ${err.message}`, { status: 500 });
  }
}
