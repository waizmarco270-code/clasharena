import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { amount, userId } = await request.json();
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay credentials missing on server" }, { status: 500 });
    }

    // Razorpay basic authentication
    const authHeader = 'Basic ' + btoa(`${keyId}:${keySecret}`);
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        amount: amount * 100, // Amount in paise (e.g. 50 INR = 5000 paise)
        currency: 'INR',
        receipt: `receipt_ca_${Date.now()}`,
        notes: {
          userId: userId,
          amount: amount.toString()
        }
      })
    });

    const order = await response.json();
    
    if (order.error) {
      return NextResponse.json({ error: order.error.description }, { status: 400 });
    }

    return NextResponse.json({ orderId: order.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
