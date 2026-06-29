import { StreamChat } from 'stream-chat';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { tournamentId } = body;

    if (!tournamentId) {
      return new NextResponse("Tournament ID required", { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
    const apiSecret = process.env.STREAM_SECRET_KEY || process.env.STREAM_SECRET;

    if (!apiKey || !apiSecret) {
      console.error("Stream API keys are missing. Ensure NEXT_PUBLIC_STREAM_KEY and STREAM_SECRET_KEY are set.");
      return new NextResponse("Server Error", { status: 500 });
    }

    if (!adminDb) {
      console.error("Firebase admin is not initialized.");
      return new NextResponse("Server Error", { status: 500 });
    }

    // Check user role
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const isSuperAdmin = userDoc.exists && userDoc.data()?.isSuperAdmin === true;
    const isStandardAdmin = userDoc.exists && userDoc.data()?.isAdmin === true;
    const isAdmin = isSuperAdmin || isStandardAdmin;

    // Check membership
    if (!isAdmin) {
      const regDoc = await adminDb.collection(`tournaments/${tournamentId}/registrations`).doc(userId).get();
      if (!regDoc.exists) {
        return new NextResponse("Forbidden - Not registered in this tournament", { status: 403 });
      }
    }

    const serverClient = StreamChat.getInstance(apiKey, apiSecret);
    const role = isSuperAdmin ? 'admin' : (isStandardAdmin ? 'channel_moderator' : 'user');

    // Upsert User securely
    await serverClient.upsertUser({
      id: userId,
      role: role,
      name: userDoc.exists ? (userDoc.data()?.username || 'Warrior') : 'Warrior',
      image: userDoc.exists ? (userDoc.data()?.photoURL || '') : '',
    });

    // Create or retrieve the channel, and add the user as a member
    const channel = serverClient.channel('gaming', `tournament_${tournamentId}`, {
      name: `Tournament Chat`,
      created_by_id: userId // Fallback for initialization
    });
    
    // Explicitly add user to channel so they can access it on the client
    await channel.addMembers([userId]);

    // Generate user token
    const token = serverClient.createToken(userId);

    return NextResponse.json({ token });
  } catch (error) {
    console.error("[STREAM_TOKEN_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
