import { auth } from '@clerk/nextjs/server';
import { adminDb } from '@/lib/firebase-admin';
import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Please enter a valid code' }, { status: 400 });
    }

    const normalizedCode = code.toUpperCase().replace(/\s+/g, '').substring(0, 20);
    if (!normalizedCode) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

    const codeRef = adminDb.collection('gift-codes').doc(normalizedCode);
    const claimRef = codeRef.collection('claims').doc(userId);
    const userRef = adminDb.collection('users').doc(userId);

    const result = await adminDb.runTransaction(async (transaction) => {
      // 1. Read Code Document
      const codeSnap = await transaction.get(codeRef);
      if (!codeSnap.exists) {
        throw new Error('Invalid or non-existent code');
      }

      const codeData = codeSnap.data()!;

      // 2. Check Status & Expiry & Limits
      if (codeData.status === 'closed') {
        throw new Error('This code is no longer active');
      }

      if (codeData.expiresAt && new Date(codeData.expiresAt).getTime() < Date.now()) {
        throw new Error('This code has expired');
      }

      if (codeData.maxUses > 0 && codeData.currentUses >= codeData.maxUses) {
        throw new Error('This code has reached its maximum usage limit');
      }

      // 3. Read Claim Document (Subcollection check)
      const claimSnap = await transaction.get(claimRef);
      if (claimSnap.exists) {
        throw new Error('You have already redeemed this code');
      }

      // 4. Read User Profile (To get their name/TH for analytics logging)
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error('User profile not found');
      const userData = userSnap.data()!;

      // --- ALL READS DONE ---
      // --- WRITES BEGIN ---

      // Write 1: Create Claim Document in Subcollection
      transaction.set(claimRef, {
        userId,
        username: userData.username || 'Warrior',
        townHall: userData.townHall || 0,
        redeemedAt: FieldValue.serverTimestamp()
      });

      // Write 2: Update Code Document (Increment uses, and auto-close if max hit)
      const newCurrentUses = (codeData.currentUses || 0) + 1;
      const codeUpdates: any = {
        currentUses: FieldValue.increment(1)
      };

      if (codeData.maxUses > 0 && newCurrentUses >= codeData.maxUses) {
        codeUpdates.status = 'closed';
      }

      transaction.update(codeRef, codeUpdates);

      // Write 3: Update User Balance
      transaction.update(userRef, {
        balance: FieldValue.increment(codeData.amount)
      });

      return { amount: codeData.amount };
    });

    return NextResponse.json({ 
      success: true, 
      amount: result.amount,
      message: `Code Redeemed! Added ${result.amount} coins to your Vault.` 
    });

  } catch (error: any) {
    console.error("Redeem Code API Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to redeem code' }, { status: 400 });
  }
}
