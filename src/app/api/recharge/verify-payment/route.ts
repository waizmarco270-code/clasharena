import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { orderId, paymentId, signature } = await request.json();
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json({ error: "Razorpay secret key missing on server" }, { status: 500 });
    }

    // Verify Razorpay Payment Signature: HMAC-SHA256 of orderId + "|" + paymentId using the Key Secret
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${orderId}|${paymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== signature) {
      return NextResponse.json({ verified: false, error: "Invalid payment signature" }, { status: 400 });
    }

    return NextResponse.json({ verified: true });
  } catch (err: any) {
    return NextResponse.json({ verified: false, error: err.message }, { status: 500 });
  }
}
