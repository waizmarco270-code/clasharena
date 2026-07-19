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
    const { tournamentId, teamId } = body;

    if (!tournamentId) {
      return new NextResponse("Tournament ID required", { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_STREAM_KEY;
    const apiSecret = process.env.STREAM_SECRET_KEY || process.env.STREAM_SECRET;

    if (!apiKey || !apiSecret) {
      console.error("Stream API keys are missing. Ensure NEXT_PUBLIC_STREAM_KEY and STREAM_SECRET_KEY are set.");
      return new NextResponse(`Server Error: API Keys Missing (Key: ${!!apiKey}, Secret: ${!!apiSecret})`, { status: 500 });
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
      if (tournamentId.startsWith('vs_')) {
        const challengeId = tournamentId.replace('vs_', '');
        const challengeDoc = await adminDb.collection('vs-challenges').doc(challengeId).get();
        if (!challengeDoc.exists) {
           return new NextResponse("Forbidden - Challenge not found", { status: 403 });
        }
        const challenge = challengeDoc.data();
        if (challenge?.creatorId !== userId && challenge?.acceptorId !== userId) {
           return new NextResponse("Forbidden - Not a participant of this battle", { status: 403 });
        }
      } else {
        const regDoc = await adminDb.collection(`tournaments/${tournamentId}/registrations`).doc(userId).get();
        if (!regDoc.exists) {
          return new NextResponse("Forbidden - Not registered in this tournament", { status: 403 });
        }
        
        // If teamId is requested, verify the user belongs to that team
        if (teamId) {
          if (teamId.startsWith('lounge_top')) {
            const tDoc = await adminDb.collection('tournaments').doc(tournamentId).get();
            const t = tDoc.data();
            if (teamId === 'lounge_top1' && t?.top1UserId !== userId) {
              return new NextResponse("Forbidden - Not Top 1", { status: 403 });
            }
            if (teamId === 'lounge_top2' && t?.top2UserId !== userId) {
              return new NextResponse("Forbidden - Not Top 2", { status: 403 });
            }
            if (teamId === 'lounge_top3' && t?.top3UserId !== userId) {
              return new NextResponse("Forbidden - Not Top 3", { status: 403 });
            }
          } else {
            const teamData = regDoc.data()?.draftedTeam;
            if (teamData !== teamId) {
               return new NextResponse("Forbidden - Not in this team", { status: 403 });
            }
          }
        }
      }
    }

    const serverClient = StreamChat.getInstance(apiKey, apiSecret, { timeout: 15000 });
    const role = isAdmin ? 'admin' : 'user';

    // Upsert User securely
    await serverClient.upsertUser({
      id: userId,
      role: role,
      name: userDoc.exists ? (userDoc.data()?.username || 'Warrior') : 'Warrior',
      image: userDoc.exists ? (userDoc.data()?.photoURL || '') : '',
    });

    // Create or retrieve the channel, and add the user as a member
    const safeChannelId = teamId 
      ? `tournament_${tournamentId.toLowerCase()}_${teamId.toLowerCase()}` 
      : `tournament_${tournamentId.toLowerCase()}`;
      
    const channelName = teamId 
      ? (teamId.startsWith('lounge_') ? `Champion's Lounge (${teamId.split('_')[1].toUpperCase()})` : `Team ${teamId.toUpperCase()} Chat`) 
      : `Global Chat`;

    const channel = serverClient.channel('gaming', safeChannelId, {
      name: channelName,
      created_by_id: userId // Fallback for initialization
    });
    
    // Ensure channel exists on Stream before adding members
    await channel.create();
    
    // Explicitly add user to channel so they can access it on the client
    await channel.addMembers([userId]);

    // Generate user token
    const token = serverClient.createToken(userId);

    return NextResponse.json({ token });
  } catch (error: any) {
    console.error("[STREAM_TOKEN_ERROR]", error);
    return new NextResponse(`Internal Server Error: ${error?.message || 'Unknown error'}`, { status: 500 });
  }
}
