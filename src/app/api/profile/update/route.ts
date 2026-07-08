import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    const body = await req.json();
    const { username, tag: rawTag, townHall, isSetup, upiId, upiQrUrl, avatarUrl, referredByCode } = body;

    if (!username || !rawTag || !townHall) {
      return NextResponse.json({ error: 'Missing required fields (Username, Tag, Town Hall)' }, { status: 400 });
    }

    // Normalize Player Tag
    const tag = rawTag.trim().startsWith('#') 
      ? rawTag.trim().toUpperCase() 
      : `#${rawTag.trim().toUpperCase()}`;

    // Validate Unique Player Tag (CoC UID)
    const usersRef = adminDb.collection('users');
    const existingUsers = await usersRef.where('tag', '==', tag).limit(1).get();
    
    if (!existingUsers.empty) {
      const existingDoc = existingUsers.docs[0];
      if (existingDoc.id !== userId) {
        return NextResponse.json({ 
          error: `The Player ID ${tag} is already registered to another Clash Arena account.` 
        }, { status: 409 });
      }
    }

    // Lock profile for 3 days
    const lockDate = new Date();
    lockDate.setDate(lockDate.getDate() + 3);

    const userRef = usersRef.doc(userId);
    const userDoc = await userRef.get();
    const existingData = userDoc.data() || {};

    const now = new Date();
    const lockedUntil = existingData.profileLockedUntil ? new Date(existingData.profileLockedUntil) : null;
    const isCurrentlyLocked = lockedUntil && lockedUntil > now;

    if (isSetup) {
      // Setup payload (preserves existing immutable fields like rank/balance if any)
      const newProfile = {
        username,
        tag,
        townHall: parseInt(townHall),
        avatarUrl: avatarUrl || existingData.avatarUrl || '',
        upiId: upiId || existingData.upiId || '',
        upiQrUrl: upiQrUrl || existingData.upiQrUrl || '',
        profileLockedUntil: lockDate.toISOString(),
        balance: existingData.balance ?? 0,
        wins: existingData.wins ?? 0,
        tournamentsPlayed: existingData.tournamentsPlayed ?? 0,
        earnings: existingData.earnings ?? 0,
        rank: existingData.rank || 'ROOKIE',
        isAdmin: existingData.isAdmin || false,
        isSuperAdmin: existingData.isSuperAdmin || false,
        updatedAt: now.toISOString(),
        referralCode: existingData.referralCode || Math.random().toString(36).substring(2, 8).toUpperCase()
      };

      // Handle referral link if provided during setup
      if (referredByCode && !existingData.referredBy) {
        const referrerQuery = await usersRef.where('referralCode', '==', referredByCode.toUpperCase()).limit(1).get();
        if (!referrerQuery.empty) {
          const referrerId = referrerQuery.docs[0].id;
          if (referrerId !== userId) {
            newProfile.referredBy = referrerId;
            newProfile.hasClaimedReferral = false;
            
            // Add a pending entry in the referrer's referrals subcollection
            await usersRef.doc(referrerId).collection('referrals').doc(userId).set({
              userId,
              username,
              status: 'Pending',
              joinedAt: now.toISOString()
            });
          }
        }
      }
      
      await userRef.set(newProfile, { merge: true });
    } else {
      // Edit payload
      if (isCurrentlyLocked) {
        // If locked, only allow updating UPI details
        await userRef.set({
          upiId: upiId !== undefined ? upiId : null,
          upiQrUrl: upiQrUrl !== undefined ? upiQrUrl : null,
          updatedAt: now.toISOString()
        }, { merge: true });
      } else {
        // If not locked, update everything and set new lock
        await userRef.set({
          username,
          tag,
          townHall: parseInt(townHall),
          upiId: upiId !== undefined ? upiId : null,
          upiQrUrl: upiQrUrl !== undefined ? upiQrUrl : null,
          profileLockedUntil: lockDate.toISOString(),
          updatedAt: now.toISOString()
        }, { merge: true });
      }
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('Profile Update API Error:', error);
    try {
      require('fs').appendFileSync('error.log', new Date().toISOString() + '\\n' + (error.stack || error.message || error) + '\\n\\n');
    } catch (e) {}
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
