import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { auth } from '@clerk/nextjs/server';

const MASTER_SUPER_ADMIN_ID = "user_3FPUpUpNM4gNnZFAu8ATO6bcQ16";

export async function POST(request: Request) {
  try {
    const { userId: callerId } = await auth();
    if (!callerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the caller is an admin
    const callerDoc = await adminDb.collection('users').doc(callerId).get();
    const callerData = callerDoc.data();
    const isCallerAdmin = callerId === MASTER_SUPER_ADMIN_ID || 
                          callerData?.isAdmin === true || 
                          callerData?.isSuperAdmin === true;

    const { audience, title, body, userId, data } = await request.json();

    if (!audience || !title || !body) {
      return NextResponse.json({ error: "Missing required parameters: audience, title, body" }, { status: 400 });
    }

    // Security Hardening: Only admins can send broadcast or target other users.
    // Non-admins can only send notifications with audience = 'admins' (e.g. for manual recharge request notification).
    if (!isCallerAdmin && audience !== 'admins') {
      return NextResponse.json({ error: "Forbidden: Non-admin users can only send alerts targeting admins." }, { status: 403 });
    }

    const customPayload = data || {};

    if (audience === 'broadcast') {
      // Send notification to the global 'broadcast' topic
      const message = {
        notification: { title, body },
        data: customPayload,
        topic: 'broadcast'
      };
      const response = await adminMessaging.send(message);
      return NextResponse.json({ success: true, messageId: response });

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

      // De-duplicate and filter empty strings
      adminTokens = Array.from(new Set(adminTokens)).filter(Boolean);

      if (adminTokens.length === 0) {
        return NextResponse.json({ success: true, message: "No admin tokens registered." });
      }

      // Send multicast push alert
      const response = await adminMessaging.sendEachForMulticast({
        tokens: adminTokens,
        notification: { title, body },
        data: customPayload
      });

      return NextResponse.json({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount
      });

    } else if (audience === 'user') {
      if (!userId) {
        return NextResponse.json({ error: "userId is required for user audience" }, { status: 400 });
      }

      // Fetch user tokens
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      let userTokens: string[] = userDoc.data()?.fcmTokens || [];
      userTokens = (Array.isArray(userTokens) ? userTokens : []).filter(Boolean);

      if (userTokens.length === 0) {
        return NextResponse.json({ success: true, message: "No registered tokens for this user." });
      }

      // Send multicast push alert
      const response = await adminMessaging.sendEachForMulticast({
        tokens: userTokens,
        notification: { title, body },
        data: customPayload
      });

      return NextResponse.json({
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount
      });

    } else {
      return NextResponse.json({ error: "Invalid audience type. Must be 'broadcast', 'admins', or 'user'." }, { status: 400 });
    }

  } catch (err: any) {
    console.error("Push notification send error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
