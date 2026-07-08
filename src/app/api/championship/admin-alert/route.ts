import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { StreamChat } from 'stream-chat';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { championshipId, message } = await request.json();
    if (!championshipId || !message) return new NextResponse("Bad Request", { status: 400 });

    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData?.isAdmin && !userData?.isSuperAdmin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
    const apiSecret = process.env.STREAM_SECRET_KEY;
    if (!apiKey || !apiSecret) return new NextResponse("Stream API keys missing", { status: 500 });

    const serverClient = StreamChat.getInstance(apiKey, apiSecret, { timeout: 15000 });
    const channelId = `tournament_${championshipId.toLowerCase()}`;
    const channel = serverClient.channel('gaming', channelId);

    const textToSend = `@all 🔔 **SYSTEM ALERT** 🔔\n\n${message}`;

    await channel.sendMessage({
      text: textToSend,
      user_id: userId,
      type: 'regular',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin alert error:", err);
    return new NextResponse(err.message, { status: 500 });
  }
}
