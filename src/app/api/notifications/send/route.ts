import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { auth } from '@clerk/nextjs/server';
import { FieldValue } from 'firebase-admin/firestore';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export async function POST(request: Request) {
  try {
    const { userId: callerId } = await auth();
    if (!callerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!adminMessaging) {
      return NextResponse.json({ error: "Push notifications service is offline (adminMessaging not initialized)" }, { status: 503 });
    }

    // Check if the caller is an admin
    const callerDoc = await adminDb.collection('users').doc(callerId).get();
    const callerData = callerDoc.data();
    const isCallerAdmin = callerId === MASTER_SUPER_ADMIN_ID || 
                          callerData?.isAdmin === true || 
                          callerData?.isSuperAdmin === true;

    const { audience, title, body, userId, userIds, data, imageUrl, redirectUrl } = await request.json();

    if (!audience || !title || !body) {
      return NextResponse.json({ error: "Missing required parameters: audience, title, body" }, { status: 400 });
    }

    // Security Hardening: Only admins can send broadcast or target other users.
    // Non-admins can only send notifications with audience = 'admins' (e.g. for manual recharge request notification).
    if (!isCallerAdmin && audience !== 'admins') {
      return NextResponse.json({ error: "Forbidden: Non-admin users can only send alerts targeting admins." }, { status: 403 });
    }

    const customPayload = data || {};
    const finalDataPayload = {
      ...customPayload,
      url: redirectUrl || '/dashboard'
    };

    let successCount = 0;
    let failureCount = 0;
    let errorsList: string[] = [];
    let loggedAudience = audience;

    if (audience === 'broadcast') {
      // Gather user tokens only from users who have FCM tokens configured
      const usersSnap = await adminDb.collection('users').where('hasFcmToken', '==', true).get();
      let allTokens: string[] = [];
      usersSnap.forEach((docSnap: any) => {
        const tokens = docSnap.data().fcmTokens;
        if (Array.isArray(tokens)) {
          allTokens.push(...tokens);
        }
      });
      allTokens = Array.from(new Set(allTokens)).filter(Boolean);

      if (allTokens.length > 0) {
        // Send in batches of 500 (standard FCM multicast limit)
        const batchSize = 500;
        for (let i = 0; i < allTokens.length; i += batchSize) {
          const batchTokens = allTokens.slice(i, i + batchSize);
          const payload: any = {
            tokens: batchTokens,
            notification: { title, body },
            data: finalDataPayload
          };

          if (imageUrl) {
            payload.notification.image = imageUrl;
          }

          const response = await adminMessaging.sendEachForMulticast(payload);
          successCount += response.successCount;
          failureCount += response.failureCount;

          response.responses.forEach((res: any) => {
            if (!res.success && res.error) {
              errorsList.push(res.error.message || res.error.code);
            }
          });
        }
      }
      loggedAudience = "All Warriors (Broadcast)";

    } else if (audience === 'admins') {
      // Gather all admin and super-admin tokens
      let adminTokens: string[] = [];

      // 1. Fetch admins
      const adminsSnap = await adminDb.collection('users').where('isAdmin', '==', true).get();
      adminsSnap.forEach((docSnap: any) => {
        const tokens = docSnap.data().fcmTokens;
        if (Array.isArray(tokens)) adminTokens.push(...tokens);
      });

      // 2. Fetch super-admins
      const superAdminsSnap = await adminDb.collection('users').where('isSuperAdmin', '==', true).get();
      superAdminsSnap.forEach((docSnap: any) => {
        const tokens = docSnap.data().fcmTokens;
        if (Array.isArray(tokens)) adminTokens.push(...tokens);
      });

      // 3. Fetch master super admin
      const masterDoc = await adminDb.collection('users').doc(MASTER_SUPER_ADMIN_ID).get();
      if (masterDoc.exists) {
        const tokens = masterDoc.data()?.fcmTokens;
        if (Array.isArray(tokens)) adminTokens.push(...tokens);
      }

      adminTokens = Array.from(new Set(adminTokens)).filter(Boolean);

      if (adminTokens.length > 0) {
        const payload: any = {
          tokens: adminTokens,
          notification: { title, body },
          data: finalDataPayload
        };
        if (imageUrl) {
          payload.notification.image = imageUrl;
        }

        const response = await adminMessaging.sendEachForMulticast(payload);
        successCount = response.successCount;
        failureCount = response.failureCount;

        response.responses.forEach((res: any) => {
          if (!res.success && res.error) {
            errorsList.push(res.error.message || res.error.code);
          }
        });
      }
      loggedAudience = "Admins & Moderators";

    } else if (audience === 'user') {
      const targetIds = userIds || (userId ? [userId] : []);
      if (!targetIds.length) {
        return NextResponse.json({ error: "userId or userIds array is required for user audience" }, { status: 400 });
      }

      let allUserTokens: string[] = [];

      // Fetch user tokens in batches of 30
      for (let i = 0; i < targetIds.length; i += 30) {
        const batchIds = targetIds.slice(i, i + 30);
        const usersSnap = await adminDb.collection('users').where(FieldValue.documentId(), 'in', batchIds).get();
        
        usersSnap.forEach((docSnap: any) => {
          const tokens = docSnap.data().fcmTokens;
          if (Array.isArray(tokens)) allUserTokens.push(...tokens);
        });
      }

      allUserTokens = Array.from(new Set(allUserTokens)).filter(Boolean);

      if (allUserTokens.length > 0) {
        for (let i = 0; i < allUserTokens.length; i += 500) {
          const batchTokens = allUserTokens.slice(i, i + 500);
          const payload: any = {
            tokens: batchTokens,
            notification: { title, body },
            data: finalDataPayload
          };
          if (imageUrl) {
            payload.notification.image = imageUrl;
          }

          const response = await adminMessaging.sendEachForMulticast(payload);
          successCount += response.successCount;
          failureCount += response.failureCount;

          response.responses.forEach((res: any) => {
            if (!res.success && res.error) {
              errorsList.push(res.error.message || res.error.code);
            }
          });
        }
      }
      loggedAudience = `Users (${targetIds.length} targets)`;

    } else if (audience === 'tournament_players') {
      const tournamentId = data?.tournamentId;
      if (!tournamentId) {
        return NextResponse.json({ error: "data.tournamentId is required for tournament_players audience" }, { status: 400 });
      }

      const regsSnap = await adminDb.collection(`tournaments/${tournamentId}/registrations`).get();
      const userIds = regsSnap.docs.map(doc => doc.id);

      if (userIds.length > 0) {
        let playerTokens: string[] = [];
        
        for (let i = 0; i < userIds.length; i += 30) {
          const batchIds = userIds.slice(i, i + 30);
          const usersSnap = await adminDb.collection('users').where(FieldValue.documentId(), 'in', batchIds).get();
          
          usersSnap.forEach((docSnap: any) => {
            const tokens = docSnap.data().fcmTokens;
            if (Array.isArray(tokens)) playerTokens.push(...tokens);
          });
        }
        
        playerTokens = Array.from(new Set(playerTokens)).filter(Boolean);

        if (playerTokens.length > 0) {
          const payload: any = {
            tokens: playerTokens,
            notification: { title, body },
            data: finalDataPayload
          };
          if (imageUrl) {
            payload.notification.image = imageUrl;
          }

          const response = await adminMessaging.sendEachForMulticast(payload);
          successCount = response.successCount;
          failureCount = response.failureCount;

          response.responses.forEach((res: any) => {
            if (!res.success && res.error) {
              errorsList.push(res.error.message || res.error.code);
            }
          });
        }
      }
      loggedAudience = `Tournament Players: ${tournamentId}`;

    } else {
      return NextResponse.json({ error: "Invalid audience type. Must be 'broadcast', 'admins', 'user', or 'tournament_players'." }, { status: 400 });
    }

    const uniqueErrors = Array.from(new Set(errorsList));

    // History saving has been disabled per user request to optimize write operations

    return NextResponse.json({
      success: true,
      successCount,
      failureCount,
      errors: uniqueErrors
    });

  } catch (err: any) {
    console.error("Push notification send error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
