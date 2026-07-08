import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { StreamChat } from 'stream-chat';

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
      hasFcmToken: true,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // 2. Subscribe token to the 'broadcast' topic for global alerts
    await adminMessaging.subscribeToTopic([token], 'broadcast');

    // 3. Register device with Stream Chat for push notifications
    const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
    const apiSecret = process.env.STREAM_SECRET_KEY;
    if (apiKey && apiSecret) {
      const serverClient = StreamChat.getInstance(apiKey, apiSecret, { timeout: 15000 });
      await serverClient.addDevice(token, 'firebase', userId);
      console.log(`Token registered with Stream Chat for user: ${userId}`);
    }

    return NextResponse.json({ success: true, message: "Token registered and subscribed to broadcast topic." });
  } catch (err: any) {
    console.error("Token registration error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
