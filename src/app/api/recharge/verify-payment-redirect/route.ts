import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { processReferralReward } from '@/lib/referral-utils';

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
    const coins = Number(orderData.notes?.coins || amount);
    const paymentType = orderData.notes?.paymentType || 'recharge';
    const ticketType = orderData.notes?.ticketType || 'none';

    if (!userId || isNaN(amount) || amount <= 0) {
      return new Response("Invalid transaction metadata", { status: 400 });
    }

    // 4. Check if this payment transaction was already processed
    const requestRef = adminDb.collection('recharge-requests').doc(paymentId);
    const requestSnap = await requestRef.get();

    if (requestSnap.exists) {
      // Replay prevention: redirect to success page directly without double crediting
      if (paymentType === 'ticket_purchase') {
        return NextResponse.redirect(new URL(`/tickets?payment=success`, request.url), 303);
      }
      return NextResponse.redirect(new URL(`/wallet?payment=success&amount=${coins}`, request.url), 303);
    }

    let isTicketFallback = false;

    // 5. Run atomic transaction to update user balance and record the recharge request
    await adminDb.runTransaction(async (transaction: any) => {
      const userRef = adminDb.collection('users').doc(userId);
      const userSnap = await transaction.get(userRef);
      const username = userSnap.exists ? (userSnap.data()?.username || 'Warrior') : 'Warrior';

      if (paymentType === 'ticket_purchase' && ticketType !== 'none') {
        const ticketRef = adminDb.collection('tickets').doc(ticketType);
        const ticketSnap = await transaction.get(ticketRef);
        const ticketData = ticketSnap.exists ? ticketSnap.data() : null;

        if (!ticketData || ticketData.stock <= 0 || !ticketData.isActive) {
          // OUT OF STOCK FALLBACK: Credit coins equivalent to the amount paid so their money isn't lost.
          isTicketFallback = true;
          transaction.update(userRef, {
            balance: FieldValue.increment(coins || amount),
            totalCoinsEarned: FieldValue.increment(coins || amount)
          });
        } else {
          // VALID TICKET PURCHASE
          // 1. Decrement Stock
          transaction.update(ticketRef, { 
            stock: FieldValue.increment(-1),
            totalSold: FieldValue.increment(1)
          });
          
          // 2. Record Buyer
          const buyerRef = ticketRef.collection('buyers').doc(paymentId);
          transaction.set(buyerRef, {
            userId,
            username,
            amount,
            purchasedAt: FieldValue.serverTimestamp()
          });

          // 3. Add Ticket to User Inventory
          transaction.update(userRef, {
            [`inventory.${ticketType}Tickets`]: FieldValue.increment(1),
            [`inventory.total${ticketType.charAt(0).toUpperCase() + ticketType.slice(1)}TicketsEarned`]: FieldValue.increment(1)
          });
        }
      } else {
        // STANDARD RECHARGE
        // Increment balance
        transaction.update(userRef, {
          balance: FieldValue.increment(coins),
          totalCoinsEarned: FieldValue.increment(coins)
        });
      }

      // Write recharge record
      transaction.set(requestRef, {
        userId,
        username,
        amount,
        coins,
        paymentType,
        ticketType,
        transactionId: paymentId,
        orderId: orderId || '',
        status: 'approved',
        method: 'Automatic',
        createdAt: FieldValue.serverTimestamp()
      });

      // 5.5 Process Squad Builder Referral Reward (Only if it's a recharge, or maybe tickets count too?)
      // We will reward them for any money spent.
      await processReferralReward(userId, coins, transaction);
    });

    // 6. Redirect back with success triggers
    if (paymentType === 'ticket_purchase') {
      if (isTicketFallback) {
         return NextResponse.redirect(new URL(`/tickets?payment=fallback&amount=${coins}`, request.url), 303);
      }
      return NextResponse.redirect(new URL(`/tickets?payment=success&type=${ticketType}`, request.url), 303);
    }

    return NextResponse.redirect(new URL(`/wallet?payment=success&amount=${coins}`, request.url), 303);
  } catch (err: any) {
    console.error("Redirect payment error:", err);
    return new Response(`Server Error: ${err.message}`, { status: 500 });
  }
}
