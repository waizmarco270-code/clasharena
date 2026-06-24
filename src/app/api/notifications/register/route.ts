import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { userId, token } = await request.json();

    if (!userId || !token) {
      return NextResponse.json({ error: "Missing userId or token" }, { status: 400 });
    }

    // 1. Add token to user profile document in Firestore
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.set({
      fcmTokens: FieldValue.arrayUnion(token),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // 2. Subscribe token to the 'broadcast' topic for global alerts
    await adminMessaging.subscribeToTopic([token], 'broadcast');

    console.log(`Token registered & subscribed to topic for user: ${userId}`);

    return NextResponse.json({ success: true, message: "Token registered and subscribed to broadcast topic." });
  } catch (err: any) {
    console.error("Token registration error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
