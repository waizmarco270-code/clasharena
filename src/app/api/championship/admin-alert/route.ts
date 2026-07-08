import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { StreamChat } from 'stream-chat';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { FieldValue, FieldPath } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
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

    // --- NATIVE FCM DISPATCH TO ALL REGISTERED PLAYERS ---
    if (adminMessaging) {
      const regsSnap = await adminDb.collection(`tournaments/${championshipId}/registrations`).get();
      const registeredUserIds = regsSnap.docs.map(doc => doc.id);
      
      if (registeredUserIds.length > 0) {
        let allTokens: string[] = [];
        
        // Batch fetch users to get their FCM tokens
        for (let i = 0; i < registeredUserIds.length; i += 30) {
          const batchIds = registeredUserIds.slice(i, i + 30);
          const usersSnap = await adminDb.collection('users')
            .where(FieldPath.documentId(), 'in', batchIds)
            .get();
            
          usersSnap.forEach((docSnap: any) => {
            const tokens = docSnap.data().fcmTokens;
            if (Array.isArray(tokens)) allTokens.push(...tokens);
          });
        }
        
        allTokens = Array.from(new Set(allTokens)).filter(Boolean);

        if (allTokens.length > 0) {
          // Dispatch FCM in batches of 500
          for (let i = 0; i < allTokens.length; i += 500) {
            const batchTokens = allTokens.slice(i, i + 500);
            await adminMessaging.sendEachForMulticast({
              tokens: batchTokens,
              notification: { 
                title: "SYSTEM ALERT 🔔", 
                body: message 
              },
              data: {
                url: `/arena/championship/${championshipId}/lobby`
              }
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Admin alert error:", err);
    return new NextResponse(err.message, { status: 500 });
  }
}
