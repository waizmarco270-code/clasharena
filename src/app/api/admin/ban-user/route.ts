import { NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { userId, actionType, strikeLevel, banType, days, banReason, decision } = await req.json();

    if (!userId || !actionType) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data()!;
    let updates: any = {};

    if (actionType === 'strike') {
      const currentStrikes = userData.strikes || 0;
      const targetStrike = strikeLevel || currentStrikes + 1;
      
      updates.strikes = targetStrike;
      updates.banned = true;
      updates.bannedAt = Date.now();
      
      if (targetStrike === 1) {
        updates.banType = 'temporary';
        updates.banExpiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 Hours
        updates.banReason = 'Strike 1: First Warning Violation.';
      } else if (targetStrike === 2) {
        updates.banType = 'temporary';
        updates.banExpiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 Days
        updates.banReason = 'Strike 2: Repeated Severe Violation.';
      } else {
        updates.banType = 'permanent';
        updates.banExpiresAt = null;
        updates.banReason = 'Strike 3: Permanent Account Termination.';
      }
    } 
    else if (actionType === 'custom_ban') {
      updates.banned = true;
      updates.banType = banType;
      updates.banReason = banReason;
      updates.bannedAt = Date.now();
      
      if (banType === 'temporary') {
        updates.banExpiresAt = Date.now() + (days * 24 * 60 * 60 * 1000);
      } else {
        updates.banExpiresAt = null;
      }
    }
    else if (actionType === 'unban') {
      updates.banned = false;
      updates.banType = null;
      updates.banExpiresAt = null;
      updates.banReason = null;
      updates.appealStatus = null;
      updates.appealText = null;
    }
    else if (actionType === 'resolve_appeal') {
      if (decision === 'accepted') {
        updates.banned = false;
        updates.banType = null;
        updates.banExpiresAt = null;
        updates.banReason = null;
      }
      updates.appealStatus = decision; // 'accepted' or 'rejected'
    }
    else {
      return NextResponse.json({ error: 'Invalid actionType' }, { status: 400 });
    }

    await userRef.update(updates);

    // Send Push Notification
    if (adminMessaging && Array.isArray(userData.fcmTokens) && userData.fcmTokens.length > 0) {
      try {
        let title = '';
        let body = '';
        
        if (updates.banned) {
          title = '⚠️ ACCOUNT SUSPENDED';
          body = `You have been banned. Reason: ${updates.banReason || 'Violation of rules.'}`;
        } else if (actionType === 'unban' || (actionType === 'resolve_appeal' && decision === 'accepted')) {
          title = '✅ ACCOUNT RESTORED';
          body = 'Your ban has been revoked. Welcome back to the arena.';
        } else if (actionType === 'resolve_appeal' && decision === 'rejected') {
          title = '❌ APPEAL REJECTED';
          body = 'Your ban appeal has been denied by the admins.';
        }

        if (title && body) {
          const payload = {
            tokens: userData.fcmTokens,
            notification: { title, body },
            data: { url: '/' }
          };
          await adminMessaging.sendEachForMulticast(payload);
        }
      } catch (e) {
        console.error('Failed to send ban notification:', e);
      }
    }

    return NextResponse.json({ success: true, updates });

  } catch (error: any) {
    console.error('Ban User API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
